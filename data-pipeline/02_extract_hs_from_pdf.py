#!/usr/bin/env python3
"""
Script 02: Extract HS codes from customs.go.th PDFs using Gemini Vision

Uses Vertex AI (billed to GCP credit) for Vision AI extraction.
Pre-filters PDF pages to save ~30% tokens.

Provenance: source_url = https://customs.go.th/data_files/{hash}.pdf
"""

import os
import sys
import json

sys.path.insert(0, os.path.dirname(__file__))
from config import RAW_DIR, get_db_conn
from utils.state_tracker import StateTracker
from utils.pdf_prefilter import prefilter_pdf, page_to_image
from utils.gcp_vertex_client import generate_vision
from utils.structured_schemas import HS_CODE_SCHEMA
from utils.validator import validate_hs_code, normalize_hs_code, validate_rate

import pdfplumber

INPUT_DIR = os.path.join(RAW_DIR, "customs-pdfs")

EXTRACTION_PROMPT = """You are a Thai customs data extraction expert.
Extract ALL HS codes and tariff information from this page.

Rules:
- Extract every HS code visible (format: XXXX.XX.XX or shorter)
- Include Thai and English descriptions if present
- Include duty rates if shown (as percentage number, 0-80)
- Include unit of measurement if shown
- If this is a tariff schedule table, extract every row
- If no HS codes are visible, return an empty array

Return JSON matching the schema provided."""


def extract_page_with_vision(pdf_path: str, page_num: int) -> list[dict]:
    """Extract HS codes from a single PDF page using Gemini Vision."""
    with pdfplumber.open(pdf_path) as pdf:
        page = pdf.pages[page_num - 1]
        img_bytes = page_to_image(page, dpi=200)

    result_text = generate_vision(
        img_bytes,
        EXTRACTION_PROMPT,
        mime_type="image/png",
        response_schema=HS_CODE_SCHEMA,
    )

    try:
        result = json.loads(result_text)
        return result.get("hs_codes", [])
    except json.JSONDecodeError:
        print(f"    Warning: could not parse Vision response for page {page_num}")
        return []


def upsert_hs_codes(conn, records: list[dict], source_url: str):
    """Insert or update extracted HS codes."""
    inserted = 0
    with conn.cursor() as cur:
        for rec in records:
            code = rec.get("code", "")
            valid, _ = validate_hs_code(code)
            if not valid:
                continue

            code = normalize_hs_code(code)
            base_rate = rec.get("base_rate")
            if base_rate is not None:
                valid_rate, _ = validate_rate(base_rate)
                if not valid_rate:
                    base_rate = None

            # Parse chapter/heading from code
            digits = code.replace(".", "")
            chapter = int(digits[:2]) if len(digits) >= 2 else None
            heading = code[:7] if len(code) >= 7 else None

            cur.execute("""
                INSERT INTO cg_hs_codes
                    (code, chapter, heading, description_th, description_en,
                     base_rate, unit, category, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
                ON CONFLICT (code) DO UPDATE SET
                    description_th = COALESCE(EXCLUDED.description_th, cg_hs_codes.description_th),
                    description_en = COALESCE(EXCLUDED.description_en, cg_hs_codes.description_en),
                    base_rate = COALESCE(EXCLUDED.base_rate, cg_hs_codes.base_rate),
                    unit = COALESCE(EXCLUDED.unit, cg_hs_codes.unit),
                    category = COALESCE(EXCLUDED.category, cg_hs_codes.category),
                    updated_at = NOW()
            """, (
                code, chapter, heading,
                rec.get("description_th"), rec.get("description_en"),
                base_rate, rec.get("unit"), rec.get("category"),
            ))
            inserted += 1

    conn.commit()
    return inserted


def main():
    conn = get_db_conn()
    tracker = StateTracker(conn, "02_extract_hs_from_pdf")

    # Load manifest
    manifest_path = os.path.join(INPUT_DIR, "_manifest.json")
    if not os.path.exists(manifest_path):
        print(f"ERROR: No manifest found at {manifest_path}")
        print("Run 00_collect_raw_data.py first!")
        sys.exit(1)

    with open(manifest_path, "r") as f:
        pdfs = json.load(f)

    total_extracted = 0

    for pdf_info in pdfs:
        filename = pdf_info["filename"]
        source_url = pdf_info["url"]
        filepath = os.path.join(INPUT_DIR, filename)

        if not os.path.exists(filepath):
            print(f"  Skip (file missing): {filename}")
            continue

        print(f"\nProcessing: {filename}")
        print(f"  Source: {source_url}")

        # Pre-filter pages
        print("  Pre-filtering pages...")
        page_classifications = prefilter_pdf(filepath)

        process_pages = [
            p for p in page_classifications
            if p["action"] in ("process_text", "process_vision")
        ]
        skip_pages = [p for p in page_classifications if p["action"] == "skip"]
        print(f"  Pages to process: {len(process_pages)}, skip: {len(skip_pages)}")

        for page_info in process_pages:
            page_num = page_info["page_num"]
            source_key = f"{filename}:page_{page_num}"

            if tracker.is_processed(source_key):
                continue

            try:
                if page_info["action"] == "process_vision":
                    # Use Gemini Vision
                    hs_codes = extract_page_with_vision(filepath, page_num)
                elif page_info["action"] == "process_text" and page_info.get("text"):
                    # Text is available — still use Vision for tables
                    if page_info.get("has_table"):
                        hs_codes = extract_page_with_vision(filepath, page_num)
                    else:
                        # Could parse text directly, but Vision is more accurate for Thai
                        hs_codes = extract_page_with_vision(filepath, page_num)
                else:
                    hs_codes = []

                if hs_codes:
                    count = upsert_hs_codes(conn, hs_codes, source_url)
                    total_extracted += count
                    tracker.mark_processed(source_key, f"extracted {count} HS codes")
                    print(f"    Page {page_num}: {count} HS codes")
                else:
                    tracker.mark_processed(source_key, "no HS codes found")

            except Exception as e:
                print(f"    Page {page_num} ERROR: {e}")
                tracker.mark_failed(source_key, str(e))

    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM cg_hs_codes")
        total = cur.fetchone()[0]

    print(f"\n{'='*40}")
    print(f"Total HS codes extracted from PDFs: {total_extracted}")
    print(f"Total HS codes in DB: {total}")
    print(f"Progress: {tracker.get_progress()}")

    conn.close()


if __name__ == "__main__":
    main()
