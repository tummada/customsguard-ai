#!/usr/bin/env python3
"""
Script 09b: Parse supplementary data sources → cg_boi_privileges, cg_excise_rates, cg_regulations

Reads raw data from:
- data/raw/boi/         → cg_boi_privileges
- data/raw/excise-tax/  → cg_excise_rates
- data/raw/cbp-cross/   → cg_regulations (doc_type='RULING', issuer='CBP USA')

Uses Gemini Vision for PDFs, structured output for tables.
Uses StateTracker for resumable processing.
"""

import os
import sys
import json
import re
import logging

import requests as http_requests

sys.path.insert(0, os.path.dirname(__file__))
from config import RAW_DIR, get_db_conn, GEMINI_API_KEY
from utils.state_tracker import StateTracker
from utils.validator import validate_hs_code, normalize_hs_code

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

BOI_DIR = os.path.join(RAW_DIR, "boi")
EXCISE_DIR = os.path.join(RAW_DIR, "excise-tax")
CBP_DIR = os.path.join(RAW_DIR, "cbp-cross")

# ── Structured Schemas ──────────────────────────────────────
BOI_SCHEMA = {
    "type": "object",
    "properties": {
        "privileges": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "activity_code": {"type": "string", "description": "BOI activity code e.g. 6.1, 7.3"},
                    "activity_name_th": {"type": "string"},
                    "activity_name_en": {"type": "string"},
                    "hs_codes": {"type": "array", "items": {"type": "string"}, "description": "Related HS codes"},
                    "privilege_type": {
                        "type": "string",
                        "enum": ["MACHINERY_EXEMPT", "RAW_MATERIAL_EXEMPT", "TAX_HOLIDAY"],
                    },
                    "section_ref": {"type": "string", "description": "Section reference e.g. 28, 29, 36"},
                    "duty_reduction": {"type": "number", "description": "Duty reduction % (null = full exemption)"},
                    "conditions": {"type": "string"},
                },
                "required": ["activity_code", "privilege_type"],
            },
        },
    },
    "required": ["privileges"],
}

EXCISE_SCHEMA = {
    "type": "object",
    "properties": {
        "rates": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "hs_code": {"type": "string"},
                    "product_category": {"type": "string"},
                    "excise_rate": {"type": "number", "description": "Ad valorem rate (%)"},
                    "excise_rate_specific": {"type": "string", "description": "Specific rate text e.g. '3 baht/litre'"},
                    "calculation_method": {"type": "string", "enum": ["AD_VALOREM", "SPECIFIC", "COMPOUND"]},
                    "conditions": {"type": "string"},
                },
                "required": ["hs_code", "product_category"],
            },
        },
    },
    "required": ["rates"],
}

CBP_RULING_SCHEMA = {
    "type": "object",
    "properties": {
        "rulings": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "ruling_number": {"type": "string", "description": "CBP ruling number e.g. NY N123456"},
                    "title": {"type": "string"},
                    "hs_codes": {"type": "array", "items": {"type": "string"}},
                    "product_description": {"type": "string"},
                    "ruling_summary": {"type": "string"},
                    "issued_date": {"type": "string", "description": "YYYY-MM-DD"},
                },
                "required": ["ruling_number", "title"],
            },
        },
    },
    "required": ["rulings"],
}

BOI_VISION_PROMPT = """You are a Thai BOI (Board of Investment) expert. Extract ALL investment
privilege details from this document page.

For each privilege found:
- activity_code: รหัสกิจกรรม (e.g. 6.1, 7.3, 1.1.1)
- activity_name_th: ชื่อกิจกรรมภาษาไทย
- activity_name_en: Activity name in English
- hs_codes: พิกัดศุลกากรที่เกี่ยวข้อง (array)
- privilege_type: MACHINERY_EXEMPT (ยกเว้นอากรเครื่องจักร), RAW_MATERIAL_EXEMPT (ยกเว้นอากรวัตถุดิบ), TAX_HOLIDAY (ยกเว้นภาษีเงินได้)
- section_ref: มาตราที่ใช้ (28, 29, 36)
- duty_reduction: % ลดหย่อน (null = ยกเว้นทั้งหมด)
- conditions: เงื่อนไข

If this page has no BOI privileges, return an empty array.
Do NOT make up information."""

EXCISE_VISION_PROMPT = """You are a Thai excise tax expert. Extract ALL excise tax rates
from this document page.

For each rate found:
- hs_code: พิกัดศุลกากร
- product_category: ประเภทสินค้า (e.g. รถยนต์, เครื่องดื่ม, แบตเตอรี่)
- excise_rate: อัตรา ad valorem (%, number only)
- excise_rate_specific: อัตราตามปริมาณ (e.g. "3 บาท/ลิตร")
- calculation_method: AD_VALOREM, SPECIFIC, or COMPOUND
- conditions: เงื่อนไข

If this page has no excise rates, return an empty array.
Do NOT make up information."""

CBP_PROMPT = """You are a US Customs and Border Protection (CBP) ruling expert.
Extract ALL classification rulings from this document.

For each ruling:
- ruling_number: CBP ruling number (e.g. NY N123456, HQ H123456)
- title: Brief title/subject
- hs_codes: HTS codes mentioned (format: XXXX.XX.XX)
- product_description: Product description
- ruling_summary: Summary of the classification decision (2-3 sentences)
- issued_date: Date in YYYY-MM-DD format

If no rulings found, return an empty array.
Do NOT make up information."""


import base64
import time

def generate_vision_rest(pdf_bytes: bytes, prompt: str, response_schema: dict | None = None) -> str:
    """Call Gemini Vision via REST API (no Vertex AI SDK needed)."""
    import base64
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        "gemini-2.5-flash:generateContent"
        f"?key={GEMINI_API_KEY}"
    )
    b64 = base64.b64encode(pdf_bytes).decode()
    body = {
        "contents": [{"parts": [
            {"inline_data": {"mime_type": "application/pdf", "data": b64}},
            {"text": prompt},
        ]}],
        "generationConfig": {"temperature": 0.1, "maxOutputTokens": 4096},
    }
    if response_schema:
        body["generationConfig"]["responseMimeType"] = "application/json"
        body["generationConfig"]["responseSchema"] = response_schema

    for attempt in range(3):
        try:
            resp = http_requests.post(url, json=body, timeout=120)
            resp.raise_for_status()
            return resp.json()["candidates"][0]["content"]["parts"][0]["text"]
        except Exception as e:
            logger.warning(f"  Vision API attempt {attempt+1}/3 failed: {e}")
            if attempt < 2:
                time.sleep(5 * (attempt + 1))
    raise RuntimeError("Vision API failed after 3 attempts")


def generate_structured_rest(prompt: str, response_schema: dict | None = None) -> str:
    """Call Gemini Flash via REST API for text-only structured output."""
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        "gemini-2.5-flash:generateContent"
        f"?key={GEMINI_API_KEY}"
    )
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.1, "maxOutputTokens": 4096},
    }
    if response_schema:
        body["generationConfig"]["responseMimeType"] = "application/json"
        body["generationConfig"]["responseSchema"] = response_schema

    resp = http_requests.post(url, json=body, timeout=60)
    resp.raise_for_status()
    return resp.json()["candidates"][0]["content"]["parts"][0]["text"]


def clean_date(val) -> str | None:
    """Fix bad dates."""
    if not val or str(val) in ("", "null", "None", "N/A"):
        return None
    val = str(val).strip()
    m = re.match(r"^(\d{4})-(\d{2})-(\d{2})$", val)
    if m:
        y, mo, d = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if 1 <= mo <= 12 and 1 <= d <= 31:
            return val
    return None


# ═══════════════════════════════════════════════════════════
# Part 1: BOI Privileges
# ═══════════════════════════════════════════════════════════

def process_boi(conn, tracker: StateTracker) -> int:
    """Process BOI data → cg_boi_privileges."""
    if not os.path.isdir(BOI_DIR):
        logger.info("BOI directory not found, skipping")
        return 0

    total = 0

    # Collect all files: top-level + pdfs/ subdirectory
    all_files = []
    for filename in sorted(os.listdir(BOI_DIR)):
        if filename.startswith("_") or os.path.isdir(os.path.join(BOI_DIR, filename)):
            continue
        all_files.append((BOI_DIR, filename))

    pdfs_dir = os.path.join(BOI_DIR, "pdfs")
    if os.path.isdir(pdfs_dir):
        for filename in sorted(os.listdir(pdfs_dir)):
            if filename.startswith("_"):
                continue
            all_files.append((pdfs_dir, filename))

    for parent_dir, filename in all_files:
        source_key = f"boi:{filename}"
        if tracker.is_processed(source_key):
            continue

        filepath = os.path.join(parent_dir, filename)
        records = []

        try:
            if filename.endswith(".json"):
                records = parse_boi_json(filepath)
            elif filename.endswith(".pdf"):
                records = parse_boi_pdf(filepath)
            else:
                tracker.mark_skipped(source_key, "unsupported format")
                continue

            for record in records:
                if insert_boi_privilege(conn, record):
                    total += 1

            tracker.mark_processed(source_key, f"{len(records)} privileges")
            logger.info(f"  BOI {filename}: {len(records)} privileges")

        except Exception as e:
            logger.error(f"  BOI ERROR {filename}: {e}")
            tracker.mark_failed(source_key, str(e))

    return total


def parse_boi_json(filepath: str) -> list[dict]:
    """Parse BOI data from JSON file."""
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    items = data if isinstance(data, list) else data.get("privileges", data.get("items", []))
    records = []

    for item in items:
        records.append({
            "activity_code": item.get("activity_code", ""),
            "activity_name_th": item.get("activity_name_th", item.get("name_th", "")),
            "activity_name_en": item.get("activity_name_en", item.get("name_en", "")),
            "hs_codes": item.get("hs_codes", []),
            "privilege_type": item.get("privilege_type", "MACHINERY_EXEMPT"),
            "section_ref": item.get("section_ref", item.get("section", "")),
            "duty_reduction": item.get("duty_reduction"),
            "conditions": item.get("conditions", ""),
            "source_url": item.get("source_url", "https://www.boi.go.th"),
        })

    return records


def parse_boi_pdf(filepath: str) -> list[dict]:
    """Parse BOI data from PDF using Gemini Vision."""
    with open(filepath, "rb") as f:
        pdf_bytes = f.read()

    result_text = generate_vision_rest(
        pdf_bytes,
        BOI_VISION_PROMPT,
        response_schema=BOI_SCHEMA,
    )

    result = json.loads(result_text)
    records = []

    for priv in result.get("privileges", []):
        priv["source_url"] = f"https://www.boi.go.th/pdf/{os.path.basename(filepath)}"
        records.append(priv)

    return records


def insert_boi_privilege(conn, record: dict) -> bool:
    """Insert a BOI privilege into cg_boi_privileges."""
    hs_codes = record.get("hs_codes", [])
    # Validate each HS code
    valid_codes = []
    for code in hs_codes:
        v, _ = validate_hs_code(code)
        if v:
            valid_codes.append(normalize_hs_code(code))
        elif re.match(r"^\d{4,6}$", code):
            valid_codes.append(code)

    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO cg_boi_privileges
                    (activity_code, activity_name_th, activity_name_en,
                     hs_codes, privilege_type, section_ref,
                     duty_reduction, conditions, source_url, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
            """, (
                record.get("activity_code"),
                record.get("activity_name_th"),
                record.get("activity_name_en"),
                valid_codes if valid_codes else None,
                record.get("privilege_type", "MACHINERY_EXEMPT"),
                record.get("section_ref"),
                record.get("duty_reduction"),
                record.get("conditions"),
                record.get("source_url"),
            ))
        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        logger.error(f"    BOI insert error: {e}")
        return False


# ═══════════════════════════════════════════════════════════
# Part 2: Excise Tax Rates
# ═══════════════════════════════════════════════════════════

def process_excise(conn, tracker: StateTracker) -> int:
    """Process excise tax data → cg_excise_rates."""
    if not os.path.isdir(EXCISE_DIR):
        logger.info("Excise tax directory not found, skipping")
        return 0

    total = 0

    # Collect all files: top-level + pdfs/ subdirectory
    all_files = []
    for filename in sorted(os.listdir(EXCISE_DIR)):
        if filename.startswith("_") or os.path.isdir(os.path.join(EXCISE_DIR, filename)):
            continue
        all_files.append((EXCISE_DIR, filename))

    pdfs_dir = os.path.join(EXCISE_DIR, "pdfs")
    if os.path.isdir(pdfs_dir):
        for filename in sorted(os.listdir(pdfs_dir)):
            if filename.startswith("_"):
                continue
            all_files.append((pdfs_dir, filename))

    for parent_dir, filename in all_files:
        source_key = f"excise:{filename}"
        if tracker.is_processed(source_key):
            continue

        filepath = os.path.join(parent_dir, filename)
        records = []

        try:
            if filename.endswith(".json"):
                records = parse_excise_json(filepath)
            elif filename.endswith(".pdf"):
                records = parse_excise_pdf(filepath)
            else:
                tracker.mark_skipped(source_key, "unsupported format")
                continue

            for record in records:
                if insert_excise_rate(conn, record):
                    total += 1

            tracker.mark_processed(source_key, f"{len(records)} rates")
            logger.info(f"  Excise {filename}: {len(records)} rates")

        except Exception as e:
            logger.error(f"  Excise ERROR {filename}: {e}")
            tracker.mark_failed(source_key, str(e))

    return total


def parse_excise_json(filepath: str) -> list[dict]:
    """Parse excise tax data from JSON file."""
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    items = data if isinstance(data, list) else data.get("rates", data.get("items", []))
    records = []

    for item in items:
        hs_code = str(item.get("hs_code", item.get("code", ""))).strip()
        if not hs_code:
            continue

        records.append({
            "hs_code": hs_code,
            "product_category": item.get("product_category", item.get("category", "")),
            "excise_rate": item.get("excise_rate", item.get("rate")),
            "excise_rate_specific": item.get("excise_rate_specific", item.get("specific_rate")),
            "calculation_method": item.get("calculation_method", "AD_VALOREM"),
            "conditions": item.get("conditions", ""),
            "source_url": item.get("source_url", "https://www.excise.go.th"),
        })

    return records


def parse_excise_pdf(filepath: str) -> list[dict]:
    """Parse excise tax data from PDF using Gemini Vision."""
    with open(filepath, "rb") as f:
        pdf_bytes = f.read()

    result_text = generate_vision_rest(
        pdf_bytes,
        EXCISE_VISION_PROMPT,
        response_schema=EXCISE_SCHEMA,
    )

    result = json.loads(result_text)
    records = []

    for rate in result.get("rates", []):
        rate["source_url"] = f"https://www.excise.go.th/pdf/{os.path.basename(filepath)}"
        records.append(rate)

    return records


def insert_excise_rate(conn, record: dict) -> bool:
    """Insert an excise rate into cg_excise_rates."""
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO cg_excise_rates
                    (hs_code, product_category, excise_rate,
                     excise_rate_specific, calculation_method,
                     conditions, source_url, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
            """, (
                record["hs_code"],
                record.get("product_category"),
                record.get("excise_rate"),
                record.get("excise_rate_specific"),
                record.get("calculation_method", "AD_VALOREM"),
                record.get("conditions"),
                record.get("source_url"),
            ))
        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        logger.error(f"    Excise insert error: {e}")
        return False


# ═══════════════════════════════════════════════════════════
# Part 3: CBP Cross-Reference Rulings (USA)
# ═══════════════════════════════════════════════════════════

def process_cbp(conn, tracker: StateTracker) -> int:
    """Process CBP rulings → cg_regulations (doc_type='RULING', issuer='CBP USA')."""
    if not os.path.isdir(CBP_DIR):
        logger.info("CBP cross-reference directory not found, skipping")
        return 0

    total = 0

    for filename in sorted(os.listdir(CBP_DIR)):
        if filename.startswith("_"):
            continue

        source_key = f"cbp:{filename}"
        if tracker.is_processed(source_key):
            continue

        filepath = os.path.join(CBP_DIR, filename)
        records = []

        try:
            if filename.endswith(".json"):
                records = parse_cbp_json(filepath)
            elif filename.endswith(".pdf"):
                records = parse_cbp_pdf(filepath)
            elif filename.endswith((".html", ".htm")):
                records = parse_cbp_html(filepath)
            else:
                tracker.mark_skipped(source_key, "unsupported format")
                continue

            for record in records:
                if insert_cbp_ruling(conn, record):
                    total += 1

            tracker.mark_processed(source_key, f"{len(records)} rulings")
            logger.info(f"  CBP {filename}: {len(records)} rulings")

        except Exception as e:
            logger.error(f"  CBP ERROR {filename}: {e}")
            tracker.mark_failed(source_key, str(e))

    return total


def parse_cbp_json(filepath: str) -> list[dict]:
    """Parse CBP rulings from JSON file."""
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    items = data if isinstance(data, list) else data.get("rulings", data.get("items", []))
    records = []

    for item in items:
        records.append({
            "ruling_number": item.get("ruling_number", item.get("number", "")),
            "title": item.get("title", item.get("subject", "")),
            "hs_codes": item.get("hs_codes", []),
            "product_description": item.get("product_description", item.get("description", "")),
            "ruling_summary": item.get("ruling_summary", item.get("summary", "")),
            "issued_date": item.get("issued_date", item.get("date", "")),
            "source_url": item.get("source_url", "https://rulings.cbp.gov"),
        })

    return records


def parse_cbp_pdf(filepath: str) -> list[dict]:
    """Parse CBP rulings from PDF using Gemini Vision."""
    with open(filepath, "rb") as f:
        pdf_bytes = f.read()

    result_text = generate_vision_rest(
        pdf_bytes,
        CBP_PROMPT,
        response_schema=CBP_RULING_SCHEMA,
    )

    result = json.loads(result_text)
    records = []

    for ruling in result.get("rulings", []):
        ruling["source_url"] = f"https://rulings.cbp.gov/ruling/{ruling.get('ruling_number', '')}"
        records.append(ruling)

    return records


def parse_cbp_html(filepath: str) -> list[dict]:
    """Parse CBP rulings from HTML."""
    from bs4 import BeautifulSoup

    with open(filepath, "r", encoding="utf-8") as f:
        html_content = f.read()

    # Use Gemini Flash for structured extraction from HTML text
    text_content = BeautifulSoup(html_content, "lxml").get_text(separator="\n", strip=True)

    if len(text_content) < 50:
        return []

    # Truncate to avoid token limits
    text_content = text_content[:8000]

    result_text = generate_structured_rest(
        f"{CBP_PROMPT}\n\n---\n\n{text_content}",
        response_schema=CBP_RULING_SCHEMA,
    )

    result = json.loads(result_text)
    records = []

    for ruling in result.get("rulings", []):
        ruling["source_url"] = f"https://rulings.cbp.gov/ruling/{ruling.get('ruling_number', '')}"
        records.append(ruling)

    return records


def insert_cbp_ruling(conn, record: dict) -> bool:
    """Insert a CBP ruling into cg_regulations."""
    hs_codes = record.get("hs_codes", [])
    issued_date = clean_date(record.get("issued_date"))

    content = record.get("ruling_summary", "")
    if record.get("product_description"):
        content = f"Product: {record['product_description']}\n\n{content}"

    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO cg_regulations
                    (doc_type, doc_number, title, issuer, issued_date,
                     content, source_url, related_hs_codes, tags, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
            """, (
                "RULING",
                record.get("ruling_number"),
                record.get("title", "CBP Ruling"),
                "CBP USA",
                issued_date,
                content,
                record.get("source_url"),
                hs_codes if hs_codes else None,
                ["cbp", "cross_reference", "usa"],
            ))
        conn.commit()
        return True
    except Exception as e:
        conn.rollback()
        logger.error(f"    CBP insert error: {e}")
        return False


# ═══════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════

def main():
    conn = get_db_conn()
    tracker = StateTracker(conn, "09b_parse_supplementary")

    logger.info("=" * 60)
    logger.info("Script 09b: Parse Supplementary Data Sources")
    logger.info("=" * 60)

    # Part 1: BOI
    logger.info("\n--- Part 1: BOI Privileges ---")
    boi_count = process_boi(conn, tracker)

    # Part 2: Excise Tax
    logger.info("\n--- Part 2: Excise Tax Rates ---")
    excise_count = process_excise(conn, tracker)

    # Part 3: CBP Cross-Reference
    logger.info("\n--- Part 3: CBP Rulings ---")
    cbp_count = process_cbp(conn, tracker)

    # Final stats
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM cg_boi_privileges")
        total_boi = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM cg_excise_rates")
        total_excise = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM cg_regulations WHERE issuer = 'CBP USA'")
        total_cbp = cur.fetchone()[0]

    logger.info(f"\n{'='*60}")
    logger.info(f"This run:")
    logger.info(f"  BOI privileges: {boi_count} (total in DB: {total_boi})")
    logger.info(f"  Excise rates:   {excise_count} (total in DB: {total_excise})")
    logger.info(f"  CBP rulings:    {cbp_count} (total in DB: {total_cbp})")
    logger.info(f"Progress: {tracker.get_progress()}")

    conn.close()


if __name__ == "__main__":
    main()
