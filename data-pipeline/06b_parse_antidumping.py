#!/usr/bin/env python3
"""
Script 06b: Parse Anti-Dumping / CVD duty data → cg_ad_duties + cg_regulations + cg_document_chunks

Reads raw HTML/PDFs from data/raw/antidumping/
- HTML tables: parsed with BeautifulSoup
- PDFs: parsed with Gemini Vision (via gcp_vertex_client.generate_vision)

Inserts AD/CVD records into cg_ad_duties.
Also creates regulation records in cg_regulations (doc_type='ANNOUNCEMENT')
and chunks the text into cg_document_chunks for RAG search.

Uses StateTracker for resumable processing.
Uses ON CONFLICT for idempotency where possible.

Provenance: source_url from Department of Foreign Trade announcements.
"""

import os
import sys
import json
import re
import logging

import base64
import requests

sys.path.insert(0, os.path.dirname(__file__))
from config import RAW_DIR, GEMINI_API_KEY, get_db_conn
from utils.state_tracker import StateTracker
from utils.chunker import chunk_text
from utils.gcp_vertex_client import embed_text
from utils.validator import validate_hs_code, normalize_hs_code

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

INPUT_DIR = os.path.join(RAW_DIR, "antidumping")

# ── Gemini Vision via Google AI Studio REST (uses GEMINI_API_KEY) ──
VISION_API_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    f"gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
)


def generate_vision_rest(pdf_bytes: bytes, prompt: str, response_schema: dict | None = None) -> str:
    """Send PDF to Gemini via Google AI Studio REST API (no Vertex AI auth needed)."""
    b64_data = base64.b64encode(pdf_bytes).decode("utf-8")
    body = {
        "contents": [{
            "parts": [
                {"inline_data": {"mime_type": "application/pdf", "data": b64_data}},
                {"text": prompt},
            ]
        }],
        "generationConfig": {
            "responseMimeType": "application/json",
        },
    }
    if response_schema:
        body["generationConfig"]["responseSchema"] = response_schema

    resp = requests.post(VISION_API_URL, json=body, timeout=120)
    resp.raise_for_status()
    result = resp.json()
    return result["candidates"][0]["content"]["parts"][0]["text"]

# ── Structured schema for Gemini Vision PDF extraction ──────
AD_DUTY_SCHEMA = {
    "type": "object",
    "properties": {
        "duties": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "hs_code": {"type": "string", "description": "HS code (4-12 digits)"},
                    "product_name_th": {"type": "string"},
                    "product_name_en": {"type": "string"},
                    "origin_country": {"type": "string", "description": "ISO 3166-1 alpha-3 country code"},
                    "duty_type": {"type": "string", "enum": ["AD", "CVD", "SAFEGUARD"]},
                    "additional_rate": {"type": "number", "description": "Additional duty rate percentage"},
                    "effective_from": {"type": "string", "description": "YYYY-MM-DD"},
                    "effective_to": {"type": "string", "description": "YYYY-MM-DD or empty"},
                    "announcement_number": {"type": "string"},
                    "summary": {"type": "string", "description": "Brief summary of the measure"},
                },
                "required": ["hs_code", "origin_country", "duty_type", "additional_rate"],
            },
        },
    },
    "required": ["duties"],
}

VISION_PROMPT = """You are a Thai customs trade remedy expert. Extract ALL anti-dumping (AD),
countervailing duty (CVD), and safeguard duty measures from this document page.

For each measure found:
- hs_code: พิกัดศุลกากร (format: XXXX.XX.XX or XXXX.XX)
- product_name_th: ชื่อสินค้าภาษาไทย
- product_name_en: Product name in English
- origin_country: ISO 3166-1 alpha-3 country code (e.g., CHN, KOR, IND, MYS)
- duty_type: AD (anti-dumping), CVD (countervailing), or SAFEGUARD
- additional_rate: อัตราอากรพิเศษ (percentage, 0-100)
- effective_from: วันที่เริ่มมีผลบังคับ (YYYY-MM-DD)
- effective_to: วันที่สิ้นสุด (YYYY-MM-DD, or empty if still active)
- announcement_number: เลขที่ประกาศ
- summary: สรุปสาระสำคัญ 1-2 ประโยค

If this page has no AD/CVD/safeguard measures, return an empty array.
Do NOT make up information — only extract what is visible."""


def parse_html_files() -> list[dict]:
    """Parse HTML files from antidumping directory for AD/CVD data."""
    records = []
    html_dir = INPUT_DIR  # HTML files are at the root of antidumping/
    if not os.path.isdir(html_dir):
        logger.info("No antidumping/ directory found, skipping HTML parsing")
        return records

    from bs4 import BeautifulSoup

    for filename in sorted(os.listdir(html_dir)):
        if not filename.endswith((".html", ".htm")):
            continue

        filepath = os.path.join(html_dir, filename)
        with open(filepath, "r", encoding="utf-8") as f:
            html_content = f.read()

        soup = BeautifulSoup(html_content, "lxml")

        for table in soup.find_all("table"):
            rows = table.find_all("tr")
            if len(rows) < 2:
                continue

            headers = [th.get_text(strip=True).lower() for th in rows[0].find_all(["th", "td"])]

            for row in rows[1:]:
                cells = [td.get_text(strip=True) for td in row.find_all("td")]
                if not cells:
                    continue

                row_dict = dict(zip(headers, cells))
                record = extract_ad_record_from_html(row_dict, filename)
                if record:
                    records.append(record)

    return records


def extract_ad_record_from_html(row_dict: dict, source_file: str) -> dict | None:
    """Extract an AD/CVD record from an HTML table row."""
    # Find HS code
    hs_code = None
    for key in ["hs_code", "hscode", "พิกัด", "tariff", "code"]:
        if key in row_dict and row_dict[key]:
            hs_code = str(row_dict[key]).strip()
            break

    if not hs_code:
        return None

    valid, _ = validate_hs_code(hs_code)
    if not valid:
        return None
    hs_code = normalize_hs_code(hs_code)

    # Find rate
    rate = None
    for key in ["rate", "อัตรา", "duty", "additional_rate", "ad_rate"]:
        if key in row_dict and row_dict[key]:
            try:
                rate_str = str(row_dict[key]).strip().replace("%", "").replace(",", "")
                if rate_str and rate_str != "-":
                    rate = float(rate_str)
            except (ValueError, TypeError):
                pass
            break

    if rate is None:
        return None

    # Find country
    country = None
    for key in ["country", "ประเทศ", "origin", "origin_country"]:
        if key in row_dict and row_dict[key]:
            country = str(row_dict[key]).strip().upper()[:3]
            break

    if not country:
        return None

    # Determine duty type
    duty_type = "AD"
    for key in ["type", "ประเภท", "duty_type"]:
        if key in row_dict and row_dict[key]:
            val = str(row_dict[key]).upper()
            if "CVD" in val or "COUNTER" in val:
                duty_type = "CVD"
            elif "SAFE" in val:
                duty_type = "SAFEGUARD"
            break

    return {
        "hs_code": hs_code,
        "product_name_th": row_dict.get("สินค้า", row_dict.get("product", "")),
        "product_name_en": row_dict.get("product_en", row_dict.get("product", "")),
        "origin_country": country,
        "duty_type": duty_type,
        "additional_rate": rate,
        "effective_from": row_dict.get("effective_from", row_dict.get("วันที่", "2024-01-01")),
        "effective_to": row_dict.get("effective_to", None),
        "announcement_number": row_dict.get("announcement", row_dict.get("เลขที่", None)),
        "source_url": f"file://{source_file}",
        "summary": row_dict.get("summary", row_dict.get("รายละเอียด", "")),
    }


def parse_pdf_files(tracker: StateTracker) -> list[dict]:
    """Parse PDF files from antidumping directory using Gemini Vision."""
    records = []
    pdf_dir = os.path.join(INPUT_DIR, "pdfs")
    if not os.path.isdir(pdf_dir):
        logger.info("No pdfs/ subdirectory found, skipping PDF parsing")
        return records

    manifest_path = os.path.join(pdf_dir, "_manifest.json")
    if not os.path.exists(manifest_path):
        # List all PDFs without manifest
        pdf_files = [
            {"filename": f, "url": f"https://www.dft.go.th/antidumping/{f}"}
            for f in sorted(os.listdir(pdf_dir))
            if f.endswith(".pdf")
        ]
    else:
        with open(manifest_path, "r") as f:
            pdf_files = json.load(f)

    for pdf_info in pdf_files:
        filename = pdf_info["filename"]
        source_url = pdf_info.get("url", "")
        filepath = os.path.join(pdf_dir, filename)

        if not os.path.exists(filepath):
            continue

        source_key = f"ad_pdf:{filename}"
        if tracker.is_processed(source_key):
            logger.info(f"  Skip (already done): {filename}")
            continue

        logger.info(f"  Processing PDF: {filename}")

        try:
            with open(filepath, "rb") as f:
                pdf_bytes = f.read()

            result_text = generate_vision_rest(
                pdf_bytes,
                VISION_PROMPT,
                response_schema=AD_DUTY_SCHEMA,
            )

            result = json.loads(result_text)
            duties = result.get("duties", [])

            for duty in duties:
                hs_code = duty.get("hs_code", "")
                valid, _ = validate_hs_code(hs_code)
                if not valid:
                    continue

                duty["hs_code"] = normalize_hs_code(hs_code)
                duty["source_url"] = source_url
                records.append(duty)

            tracker.mark_processed(source_key, f"extracted {len(duties)} duties")
            logger.info(f"    Extracted {len(duties)} AD/CVD duties")

        except json.JSONDecodeError:
            logger.warning(f"    Could not parse Vision response for {filename}")
            tracker.mark_failed(source_key, "JSON parse error from Vision")
        except Exception as e:
            logger.error(f"    ERROR processing {filename}: {e}")
            tracker.mark_failed(source_key, str(e))

    return records


def clean_date(val) -> str | None:
    """Fix bad dates: '', 'null', invalid formats."""
    if not val or str(val) in ("", "null", "None", "N/A"):
        return None
    val = str(val).strip()
    m = re.match(r"^(\d{4})-(\d{2})-(\d{2})$", val)
    if m:
        y, mo, d = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if 1 <= mo <= 12 and 1 <= d <= 31:
            return val
    return None


def insert_ad_duty(conn, record: dict) -> bool:
    """Insert an AD/CVD duty record into cg_ad_duties."""
    effective_from = clean_date(record.get("effective_from"))
    if not effective_from:
        effective_from = "2024-01-01"

    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO cg_ad_duties
                    (hs_code, product_name_th, product_name_en,
                     origin_country, duty_type, additional_rate,
                     effective_from, effective_to, announcement_number,
                     source_url, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
            """, (
                record["hs_code"],
                record.get("product_name_th"),
                record.get("product_name_en"),
                record["origin_country"],
                record["duty_type"],
                record["additional_rate"],
                effective_from,
                clean_date(record.get("effective_to")),
                record.get("announcement_number"),
                record.get("source_url"),
            ))
        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        logger.error(f"    Insert error for {record['hs_code']}: {e}")
        return False


def insert_regulation(conn, record: dict) -> str | None:
    """Insert a regulation record for the AD/CVD measure. Returns regulation ID."""
    announcement = record.get("announcement_number", "")
    title = f"มาตรการตอบโต้การทุ่มตลาด ({record['duty_type']}) — {record.get('product_name_th', record['hs_code'])}"
    content = record.get("summary", "")
    if not content:
        content = (
            f"สินค้า: {record.get('product_name_th', '')} ({record.get('product_name_en', '')})\n"
            f"พิกัด: {record['hs_code']}\n"
            f"ประเทศต้นทาง: {record['origin_country']}\n"
            f"ประเภทมาตรการ: {record['duty_type']}\n"
            f"อัตราอากรพิเศษ: {record['additional_rate']}%\n"
            f"มีผลตั้งแต่: {record.get('effective_from', 'N/A')}"
        )

    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO cg_regulations
                    (doc_type, doc_number, title, issuer, issued_date,
                     content, source_url, related_hs_codes, tags, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                RETURNING id::text
            """, (
                "ANNOUNCEMENT",
                announcement or None,
                title,
                "Department of Foreign Trade",
                clean_date(record.get("effective_from")),
                content,
                record.get("source_url"),
                [record["hs_code"]] if record.get("hs_code") else None,
                ["antidumping", record["duty_type"].lower()],
            ))
            row = cur.fetchone()
            conn.commit()
            return row[0] if row else None
    except Exception as e:
        conn.rollback()
        logger.error(f"    Regulation insert error: {e}")
        return None


def chunk_and_insert(conn, regulation_id: str, content: str, source_url: str, metadata_extra: dict):
    """Chunk regulation text and insert into cg_document_chunks."""
    if not content or len(content.strip()) < 20:
        return 0

    base_metadata = {
        "source_url": source_url or "",
        "regulation_id": regulation_id,
    }
    base_metadata.update(metadata_extra)

    chunks = chunk_text(content, chunk_size=512, overlap=50, metadata=base_metadata)

    inserted = 0
    for chunk in chunks:
        try:
            embedding = embed_text(
                f"Anti-dumping duty regulation\n{chunk['chunk_text']}"
            )
            vec_str = "[" + ",".join(str(v) for v in embedding) + "]"

            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO cg_document_chunks
                        (source_type, source_id, chunk_index, chunk_text,
                         embedding, metadata)
                    VALUES (%s, %s, %s, %s, %s::vector, %s::jsonb)
                """, (
                    "REGULATION",
                    regulation_id,
                    chunk["chunk_index"],
                    chunk["chunk_text"],
                    vec_str,
                    json.dumps(chunk["metadata"], ensure_ascii=False),
                ))
            conn.commit()
            inserted += 1
        except Exception as e:
            conn.rollback()
            logger.error(f"    Chunk insert error: {e}")

    return inserted


def main():
    conn = get_db_conn()
    tracker = StateTracker(conn, "06b_parse_antidumping")

    if not os.path.isdir(INPUT_DIR):
        logger.error(f"Input directory not found: {INPUT_DIR}")
        logger.info("Create data/raw/antidumping/html/ and/or data/raw/antidumping/pdf/ with source files")
        conn.close()
        return

    total_duties = 0
    total_regulations = 0
    total_chunks = 0

    # Phase 1: Parse HTML tables
    logger.info("Phase 1: Parsing HTML tables...")
    html_records = parse_html_files()
    logger.info(f"  Found {len(html_records)} records from HTML")

    # Phase 2: Parse PDFs via Gemini Vision
    logger.info("Phase 2: Parsing PDFs via Gemini Vision...")
    pdf_records = parse_pdf_files(tracker)
    logger.info(f"  Found {len(pdf_records)} records from PDFs")

    all_records = html_records + pdf_records

    # Phase 3: Insert into DB
    logger.info(f"\nPhase 3: Inserting {len(all_records)} records into DB...")
    for record in all_records:
        source_key = f"ad:{record['hs_code']}:{record['origin_country']}:{record['duty_type']}"

        if tracker.is_processed(source_key):
            continue

        try:
            # Insert AD duty
            if insert_ad_duty(conn, record):
                total_duties += 1

                # Insert regulation
                reg_id = insert_regulation(conn, record)
                if reg_id:
                    total_regulations += 1

                    # Chunk and embed regulation text
                    content = record.get("summary", "")
                    if not content:
                        content = (
                            f"มาตรการตอบโต้การทุ่มตลาด {record['duty_type']} "
                            f"สินค้า {record.get('product_name_th', record['hs_code'])} "
                            f"จากประเทศ {record['origin_country']} "
                            f"อัตรา {record['additional_rate']}%"
                        )

                    chunks_inserted = chunk_and_insert(
                        conn, reg_id, content,
                        record.get("source_url", ""),
                        {"duty_type": record["duty_type"], "origin_country": record["origin_country"]},
                    )
                    total_chunks += chunks_inserted

                tracker.mark_processed(source_key, f"duty+reg+{total_chunks}chunks")
            else:
                tracker.mark_failed(source_key, "duty insert failed")

        except Exception as e:
            logger.error(f"  ERROR {source_key}: {e}")
            tracker.mark_failed(source_key, str(e))

    # Final stats
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM cg_ad_duties")
        total_ad = cur.fetchone()[0]
        cur.execute("SELECT duty_type, COUNT(*) FROM cg_ad_duties GROUP BY duty_type")
        by_type = cur.fetchall()

    logger.info(f"\n{'='*50}")
    logger.info(f"AD/CVD duties inserted this run: {total_duties}")
    logger.info(f"Regulations created: {total_regulations}")
    logger.info(f"Document chunks created: {total_chunks}")
    logger.info(f"Total AD/CVD duties in DB: {total_ad}")
    for duty_type, count in by_type:
        logger.info(f"  {duty_type}: {count}")
    logger.info(f"Progress: {tracker.get_progress()}")

    conn.close()


if __name__ == "__main__":
    main()
