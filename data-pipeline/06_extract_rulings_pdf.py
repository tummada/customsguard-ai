#!/usr/bin/env python3
"""
Script 06: Extract customs rulings from PDFs using Gemini Vision

Uses Vertex AI (billed to GCP credit) for Vision extraction.
Pre-filters pages to save tokens.
Uses Structured Outputs to prevent hallucination.

Provenance: source_url = customs.go.th PDF URL + page number in metadata
"""

import os
import sys
import json

sys.path.insert(0, os.path.dirname(__file__))
from config import RAW_DIR, get_db_conn
from utils.state_tracker import StateTracker
from utils.pdf_prefilter import prefilter_pdf, page_to_image
from utils.gcp_vertex_client import generate_vision
from utils.structured_schemas import RULING_SCHEMA

import pdfplumber

INPUT_DIR = os.path.join(RAW_DIR, "customs-pdfs")

RULING_PROMPT = """You are a Thai customs law expert. Extract ALL rulings, classifications,
and legal decisions from this page.

For each ruling/decision found:
- doc_number: เลขที่เอกสาร (e.g., "ประกาศที่ 116/2567")
- title: ชื่อเรื่อง
- doc_type: one of RULING, COURT_CASE, ANNOUNCEMENT, LAW, MINISTERIAL
- hs_codes: all HS codes mentioned (format: XXXX.XX.XX)
- base_rate: duty rate if mentioned (0-80)
- ruling_summary: สรุปสาระสำคัญ 2-3 ประโยค (Thai)
- issued_date: วันที่ออก (YYYY-MM-DD)
- issuer: หน่วยงานที่ออก

If this page has no rulings/decisions, return an empty array.
Do NOT make up information — only extract what is visible on the page."""


def extract_rulings_from_page(pdf_path: str, page_num: int) -> list[dict]:
    """Extract rulings from a single PDF page using Gemini Vision."""
    with pdfplumber.open(pdf_path) as pdf:
        page = pdf.pages[page_num - 1]
        img_bytes = page_to_image(page, dpi=200)

    result_text = generate_vision(
        img_bytes,
        RULING_PROMPT,
        mime_type="image/png",
        response_schema=RULING_SCHEMA,
    )

    try:
        result = json.loads(result_text)
        return result.get("rulings", [])
    except json.JSONDecodeError:
        print(f"    Warning: could not parse Vision response for page {page_num}")
        return []


def insert_ruling(conn, ruling: dict, source_url: str, page_num: int):
    """Insert a ruling into cg_regulations."""
    hs_codes = ruling.get("hs_codes", [])

    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO cg_regulations
                (doc_type, doc_number, title, issuer, issued_date,
                 content, source_url, related_hs_codes, tags,
                 updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
        """, (
            ruling.get("doc_type", "RULING"),
            ruling.get("doc_number"),
            ruling.get("title", "Untitled"),
            ruling.get("issuer", "กรมศุลกากร"),
            ruling.get("issued_date"),
            ruling.get("ruling_summary", ""),
            source_url,
            hs_codes if hs_codes else None,
            [f"page_{page_num}", "pdf_extraction"],
        ))
    conn.commit()


def main():
    conn = get_db_conn()
    tracker = StateTracker(conn, "06_extract_rulings_pdf")

    manifest_path = os.path.join(INPUT_DIR, "_manifest.json")
    if not os.path.exists(manifest_path):
        print(f"ERROR: No manifest found at {manifest_path}")
        sys.exit(1)

    with open(manifest_path, "r") as f:
        pdfs = json.load(f)

    total_rulings = 0

    for pdf_info in pdfs:
        filename = pdf_info["filename"]
        source_url = pdf_info["url"]
        filepath = os.path.join(INPUT_DIR, filename)

        if not os.path.exists(filepath):
            continue

        print(f"\nProcessing: {filename}")

        # Pre-filter pages
        page_classifications = prefilter_pdf(filepath)
        process_pages = [
            p for p in page_classifications
            if p["action"] in ("process_text", "process_vision")
        ]
        print(f"  Pages to process: {len(process_pages)}/{len(page_classifications)}")

        for page_info in process_pages:
            page_num = page_info["page_num"]
            source_key = f"ruling:{filename}:page_{page_num}"

            if tracker.is_processed(source_key):
                continue

            try:
                rulings = extract_rulings_from_page(filepath, page_num)

                if rulings:
                    for ruling in rulings:
                        insert_ruling(conn, ruling, source_url, page_num)
                        total_rulings += 1

                    tracker.mark_processed(source_key, f"extracted {len(rulings)} rulings")
                    print(f"    Page {page_num}: {len(rulings)} rulings")
                else:
                    tracker.mark_processed(source_key, "no rulings found")

            except Exception as e:
                print(f"    Page {page_num} ERROR: {e}")
                tracker.mark_failed(source_key, str(e))

    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM cg_regulations")
        total = cur.fetchone()[0]

    print(f"\n{'='*40}")
    print(f"Rulings extracted from PDFs: {total_rulings}")
    print(f"Total regulations in DB: {total}")
    print(f"Progress: {tracker.get_progress()}")

    conn.close()


if __name__ == "__main__":
    main()
