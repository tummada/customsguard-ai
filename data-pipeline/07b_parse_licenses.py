#!/usr/bin/env python3
"""
Script 07b: Parse LPI (License/Permit/Certificate) controls → cg_lpi_controls + cg_document_chunks

Reads raw data from data/raw/lpi-controls/
- agency pages (HTML/JSON) listing HS codes that require licenses
- PDF announcements from FDA, TISI, NBTC, DFT, DLD, DOA

Inserts into cg_lpi_controls.
Chunks requirements text and inserts into cg_document_chunks for RAG search.

Uses StateTracker for resumable processing.
Provenance: source_url from each agency page.
"""

import os
import sys
import json
import re
import logging

sys.path.insert(0, os.path.dirname(__file__))
from config import RAW_DIR, get_db_conn
from utils.state_tracker import StateTracker
from utils.chunker import chunk_text
from utils.gcp_vertex_client import generate_vision, embed_text
from utils.validator import validate_hs_code, normalize_hs_code

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

INPUT_DIR = os.path.join(RAW_DIR, "lpi-controls")

# Agency metadata
AGENCIES = {
    "FDA": {
        "name_th": "สำนักงานคณะกรรมการอาหารและยา (อย.)",
        "name_en": "Food and Drug Administration",
        "source_base": "https://www.fda.moph.go.th",
    },
    "TISI": {
        "name_th": "สำนักงานมาตรฐานผลิตภัณฑ์อุตสาหกรรม (สมอ.)",
        "name_en": "Thai Industrial Standards Institute",
        "source_base": "https://www.tisi.go.th",
    },
    "NBTC": {
        "name_th": "สำนักงาน กสทช.",
        "name_en": "National Broadcasting and Telecommunications Commission",
        "source_base": "https://www.nbtc.go.th",
    },
    "DFT": {
        "name_th": "กรมการค้าต่างประเทศ",
        "name_en": "Department of Foreign Trade",
        "source_base": "https://www.dft.go.th",
    },
    "DLD": {
        "name_th": "กรมปศุสัตว์",
        "name_en": "Department of Livestock Development",
        "source_base": "https://www.dld.go.th",
    },
    "DOA": {
        "name_th": "กรมวิชาการเกษตร",
        "name_en": "Department of Agriculture",
        "source_base": "https://www.doa.go.th",
    },
    "EXCISE": {
        "name_th": "กรมสรรพสามิต",
        "name_en": "Excise Department",
        "source_base": "https://www.excise.go.th",
    },
    "CITES": {
        "name_th": "กรมอุทยานแห่งชาติ สัตว์ป่า และพันธุ์พืช (CITES)",
        "name_en": "CITES Thailand",
        "source_base": "https://www.dnp.go.th",
    },
}

# Structured schema for Gemini Vision extraction of license requirements
LICENSE_SCHEMA = {
    "type": "object",
    "properties": {
        "licenses": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "hs_code": {"type": "string", "description": "HS code (4-12 digits)"},
                    "control_type": {
                        "type": "string",
                        "enum": ["LICENSE", "PERMIT", "CERTIFICATE", "STANDARD"],
                    },
                    "agency_code": {"type": "string", "description": "Agency code: FDA, TISI, NBTC, DFT, DLD, DOA, EXCISE, CITES"},
                    "requirement_th": {"type": "string", "description": "เงื่อนไข/ข้อกำหนดภาษาไทย"},
                    "requirement_en": {"type": "string", "description": "Requirement in English"},
                    "applies_to": {"type": "string", "enum": ["IMPORT", "EXPORT", "BOTH"]},
                },
                "required": ["hs_code", "control_type", "agency_code"],
            },
        },
    },
    "required": ["licenses"],
}

VISION_PROMPT = """You are a Thai import/export regulatory expert. Extract ALL license,
permit, certificate, and standard requirements from this document.

For each requirement found:
- hs_code: พิกัดศุลกากร (format: XXXX.XX.XX or 4-6 digit prefix)
- control_type: LICENSE (ใบอนุญาต), PERMIT (ใบผ่าน), CERTIFICATE (ใบรับรอง), or STANDARD (มาตรฐาน)
- agency_code: FDA, TISI, NBTC, DFT, DLD, DOA, EXCISE, CITES
- requirement_th: เงื่อนไขที่ต้องปฏิบัติ (Thai)
- requirement_en: Requirements (English)
- applies_to: IMPORT, EXPORT, or BOTH

If this page has no license/permit requirements, return an empty array.
Do NOT make up information — only extract what is visible."""


def parse_json_files(tracker: StateTracker) -> list[dict]:
    """Parse JSON files containing structured LPI data."""
    records = []

    for agency_code, agency_info in AGENCIES.items():
        agency_dir = os.path.join(INPUT_DIR, agency_code.lower())
        if not os.path.isdir(agency_dir):
            continue

        for filename in sorted(os.listdir(agency_dir)):
            if not filename.endswith(".json"):
                continue

            source_key = f"lpi_json:{agency_code}:{filename}"
            if tracker.is_processed(source_key):
                continue

            filepath = os.path.join(agency_dir, filename)
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    data = json.load(f)

                items = data if isinstance(data, list) else data.get("items", data.get("data", []))
                if not isinstance(items, list):
                    tracker.mark_skipped(source_key, "no list data found")
                    continue

                count = 0
                for item in items:
                    record = extract_lpi_from_json(item, agency_code, agency_info)
                    if record:
                        records.append(record)
                        count += 1

                tracker.mark_processed(source_key, f"{count} records")
                logger.info(f"  {agency_code}/{filename}: {count} records")

            except Exception as e:
                logger.error(f"  ERROR {agency_code}/{filename}: {e}")
                tracker.mark_failed(source_key, str(e))

    return records


def extract_lpi_from_json(item: dict, agency_code: str, agency_info: dict) -> dict | None:
    """Extract LPI record from a JSON item."""
    hs_code = None
    for key in ["hs_code", "hscode", "code", "พิกัด", "tariff"]:
        if key in item and item[key]:
            hs_code = str(item[key]).strip()
            break

    if not hs_code:
        return None

    valid, _ = validate_hs_code(hs_code)
    if not valid:
        # Allow short prefixes (4-6 digits) for LPI matching
        if not re.match(r"^\d{4,6}$", hs_code):
            return None

    hs_code = normalize_hs_code(hs_code) if len(hs_code) > 6 else hs_code

    control_type = "LICENSE"
    for key in ["control_type", "type", "ประเภท"]:
        if key in item and item[key]:
            val = str(item[key]).upper()
            if val in ("LICENSE", "PERMIT", "CERTIFICATE", "STANDARD"):
                control_type = val
            break

    applies_to = "IMPORT"
    for key in ["applies_to", "direction", "ทิศทาง"]:
        if key in item and item[key]:
            val = str(item[key]).upper()
            if val in ("IMPORT", "EXPORT", "BOTH"):
                applies_to = val
            break

    return {
        "hs_code": hs_code,
        "control_type": control_type,
        "agency_code": agency_code,
        "agency_name_th": agency_info["name_th"],
        "agency_name_en": agency_info["name_en"],
        "requirement_th": item.get("requirement_th", item.get("เงื่อนไข", "")),
        "requirement_en": item.get("requirement_en", item.get("requirement", "")),
        "applies_to": applies_to,
        "source_url": item.get("source_url", agency_info["source_base"]),
    }


def parse_html_files(tracker: StateTracker) -> list[dict]:
    """Parse HTML pages from agency websites."""
    records = []
    html_dir = os.path.join(INPUT_DIR, "html")
    if not os.path.isdir(html_dir):
        return records

    from bs4 import BeautifulSoup

    for filename in sorted(os.listdir(html_dir)):
        if not filename.endswith((".html", ".htm")):
            continue

        source_key = f"lpi_html:{filename}"
        if tracker.is_processed(source_key):
            continue

        filepath = os.path.join(html_dir, filename)
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                html_content = f.read()

            soup = BeautifulSoup(html_content, "lxml")
            count = 0

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

                    # Try to detect agency from filename or content
                    agency_code = detect_agency_from_filename(filename)
                    agency_info = AGENCIES.get(agency_code, AGENCIES["DFT"])

                    record = extract_lpi_from_json(row_dict, agency_code, agency_info)
                    if record:
                        record["source_url"] = f"file://{filename}"
                        records.append(record)
                        count += 1

            tracker.mark_processed(source_key, f"{count} records")
            logger.info(f"  HTML {filename}: {count} records")

        except Exception as e:
            logger.error(f"  ERROR HTML {filename}: {e}")
            tracker.mark_failed(source_key, str(e))

    return records


def detect_agency_from_filename(filename: str) -> str:
    """Detect agency code from filename."""
    filename_lower = filename.lower()
    for code in AGENCIES:
        if code.lower() in filename_lower:
            return code
    return "DFT"


def parse_pdf_files(tracker: StateTracker) -> list[dict]:
    """Parse PDF files using Gemini Vision."""
    records = []
    pdf_dir = os.path.join(INPUT_DIR, "pdf")
    if not os.path.isdir(pdf_dir):
        return records

    for filename in sorted(os.listdir(pdf_dir)):
        if not filename.endswith(".pdf"):
            continue

        source_key = f"lpi_pdf:{filename}"
        if tracker.is_processed(source_key):
            continue

        filepath = os.path.join(pdf_dir, filename)
        logger.info(f"  Processing PDF: {filename}")

        try:
            with open(filepath, "rb") as f:
                pdf_bytes = f.read()

            result_text = generate_vision(
                pdf_bytes,
                VISION_PROMPT,
                mime_type="application/pdf",
                response_schema=LICENSE_SCHEMA,
            )

            result = json.loads(result_text)
            licenses = result.get("licenses", [])

            for lic in licenses:
                agency_code = lic.get("agency_code", "DFT")
                agency_info = AGENCIES.get(agency_code, AGENCIES["DFT"])

                hs_code = lic.get("hs_code", "")
                if not hs_code:
                    continue

                records.append({
                    "hs_code": hs_code,
                    "control_type": lic.get("control_type", "LICENSE"),
                    "agency_code": agency_code,
                    "agency_name_th": agency_info["name_th"],
                    "agency_name_en": agency_info["name_en"],
                    "requirement_th": lic.get("requirement_th", ""),
                    "requirement_en": lic.get("requirement_en", ""),
                    "applies_to": lic.get("applies_to", "IMPORT"),
                    "source_url": f"https://www.dft.go.th/lpi/{filename}",
                })

            tracker.mark_processed(source_key, f"extracted {len(licenses)} licenses")
            logger.info(f"    Extracted {len(licenses)} license requirements")

        except json.JSONDecodeError:
            logger.warning(f"    Could not parse Vision response for {filename}")
            tracker.mark_failed(source_key, "JSON parse error from Vision")
        except Exception as e:
            logger.error(f"    ERROR {filename}: {e}")
            tracker.mark_failed(source_key, str(e))

    return records


def insert_lpi_control(conn, record: dict) -> bool:
    """Insert an LPI control record into cg_lpi_controls."""
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO cg_lpi_controls
                    (hs_code, control_type, agency_code,
                     agency_name_th, agency_name_en,
                     requirement_th, requirement_en,
                     applies_to, source_url, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
            """, (
                record["hs_code"],
                record["control_type"],
                record["agency_code"],
                record.get("agency_name_th"),
                record.get("agency_name_en"),
                record.get("requirement_th"),
                record.get("requirement_en"),
                record.get("applies_to", "IMPORT"),
                record.get("source_url"),
            ))
        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        logger.error(f"    Insert error for {record['hs_code']}: {e}")
        return False


def chunk_and_insert(conn, record: dict):
    """Chunk requirements text and insert into cg_document_chunks."""
    # Build rich text for chunking
    parts = []
    if record.get("agency_name_th"):
        parts.append(f"หน่วยงาน: {record['agency_name_th']}")
    parts.append(f"พิกัด: {record['hs_code']}")
    parts.append(f"ประเภท: {record['control_type']}")
    if record.get("requirement_th"):
        parts.append(f"เงื่อนไข: {record['requirement_th']}")
    if record.get("requirement_en"):
        parts.append(f"Requirement: {record['requirement_en']}")

    text = "\n".join(parts)
    if len(text.strip()) < 20:
        return 0

    metadata = {
        "source_url": record.get("source_url", ""),
        "agency_code": record["agency_code"],
        "control_type": record["control_type"],
        "hs_code": record["hs_code"],
    }

    chunks = chunk_text(text, chunk_size=512, overlap=50, metadata=metadata)

    inserted = 0
    for chunk in chunks:
        try:
            embedding = embed_text(
                f"Import license requirement {record['agency_code']}\n{chunk['chunk_text']}"
            )
            vec_str = "[" + ",".join(str(v) for v in embedding) + "]"

            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO cg_document_chunks
                        (source_type, source_id, chunk_index, chunk_text,
                         embedding, metadata)
                    VALUES (%s, %s, %s, %s, %s::vector, %s::jsonb)
                """, (
                    "LPI_CONTROL",
                    f"lpi:{record['hs_code']}:{record['agency_code']}",
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
    tracker = StateTracker(conn, "07b_parse_licenses")

    if not os.path.isdir(INPUT_DIR):
        logger.error(f"Input directory not found: {INPUT_DIR}")
        logger.info("Create data/raw/lpi-controls/ with agency subdirectories or html/pdf files")
        conn.close()
        return

    total_controls = 0
    total_chunks = 0

    # Phase 1: Parse JSON files
    logger.info("Phase 1: Parsing JSON files...")
    json_records = parse_json_files(tracker)
    logger.info(f"  Found {len(json_records)} records from JSON")

    # Phase 2: Parse HTML files
    logger.info("Phase 2: Parsing HTML files...")
    html_records = parse_html_files(tracker)
    logger.info(f"  Found {len(html_records)} records from HTML")

    # Phase 3: Parse PDF files via Gemini Vision
    logger.info("Phase 3: Parsing PDFs via Gemini Vision...")
    pdf_records = parse_pdf_files(tracker)
    logger.info(f"  Found {len(pdf_records)} records from PDFs")

    all_records = json_records + html_records + pdf_records

    # Phase 4: Insert into DB
    logger.info(f"\nPhase 4: Inserting {len(all_records)} records into DB...")
    for record in all_records:
        source_key = f"lpi_insert:{record['hs_code']}:{record['agency_code']}:{record['control_type']}"

        if tracker.is_processed(source_key):
            continue

        try:
            if insert_lpi_control(conn, record):
                total_controls += 1

                # Chunk requirements text for RAG
                chunks_inserted = chunk_and_insert(conn, record)
                total_chunks += chunks_inserted

                tracker.mark_processed(source_key, f"1 control + {chunks_inserted} chunks")
            else:
                tracker.mark_failed(source_key, "insert failed")

        except Exception as e:
            logger.error(f"  ERROR {source_key}: {e}")
            tracker.mark_failed(source_key, str(e))

    # Final stats
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM cg_lpi_controls")
        total_lpi = cur.fetchone()[0]
        cur.execute("SELECT agency_code, COUNT(*) FROM cg_lpi_controls GROUP BY agency_code ORDER BY COUNT(*) DESC")
        by_agency = cur.fetchall()

    logger.info(f"\n{'='*50}")
    logger.info(f"LPI controls inserted this run: {total_controls}")
    logger.info(f"Document chunks created: {total_chunks}")
    logger.info(f"Total LPI controls in DB: {total_lpi}")
    for agency, count in by_agency:
        logger.info(f"  {agency}: {count}")
    logger.info(f"Progress: {tracker.get_progress()}")

    conn.close()


if __name__ == "__main__":
    main()
