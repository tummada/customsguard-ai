#!/usr/bin/env python3
"""
Script 05: Parse ecs-support.github.io regulations → cg_regulations

Parses clean HTML/Markdown posts into structured regulation records.
No AI needed — the HTML is well-structured.

Provenance: source_url = https://ecs-support.github.io/post/law/customs/{year}/{year}-{number}/
"""

import os
import sys
import re
import json
from datetime import datetime

sys.path.insert(0, os.path.dirname(__file__))
from config import RAW_DIR, get_db_conn
from utils.state_tracker import StateTracker
from utils.validator import validate_source_url

INPUT_DIR = os.path.join(RAW_DIR, "ecs-regulations")


def parse_markdown_frontmatter(content: str) -> tuple[dict, str]:
    """Parse YAML frontmatter from a Markdown file."""
    meta = {}
    body = content

    if content.startswith("---"):
        parts = content.split("---", 2)
        if len(parts) >= 3:
            frontmatter = parts[1].strip()
            body = parts[2].strip()

            for line in frontmatter.split("\n"):
                line = line.strip()
                if ":" in line:
                    key, _, value = line.partition(":")
                    meta[key.strip().lower()] = value.strip().strip('"').strip("'")

    return meta, body


def parse_html_post(filepath: str) -> dict | None:
    """Parse an HTML regulation post."""
    from bs4 import BeautifulSoup

    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # Check if it's Markdown with frontmatter
    if filepath.endswith(".md"):
        meta, body = parse_markdown_frontmatter(content)

        # Convert Markdown body to plain text (good enough for regulations)
        # Remove Markdown formatting
        body = re.sub(r"#{1,6}\s*", "", body)          # headers
        body = re.sub(r"\*\*(.+?)\*\*", r"\1", body)   # bold
        body = re.sub(r"\*(.+?)\*", r"\1", body)       # italic
        body = re.sub(r"\[(.+?)\]\(.+?\)", r"\1", body) # links
        body = re.sub(r"!\[.*?\]\(.+?\)", "", body)     # images

        title = meta.get("title", "")
        date_str = meta.get("date", "")
        tags = meta.get("tags", "").split(",") if meta.get("tags") else []
        categories = meta.get("categories", "").split(",") if meta.get("categories") else []

    else:
        # Parse HTML
        soup = BeautifulSoup(content, "lxml")
        body = soup.get_text(separator="\n", strip=True)
        title = ""
        date_str = ""
        tags = []
        categories = []

        # Try to extract title from HTML
        title_elem = soup.find("title") or soup.find("h1")
        if title_elem:
            title = title_elem.get_text(strip=True)

        meta = {}

    if not body or len(body.strip()) < 20:
        return None

    return {
        "title": title,
        "content": body,
        "date_str": date_str,
        "tags": [t.strip() for t in tags if t.strip()],
        "categories": [c.strip() for c in categories if c.strip()],
        "meta": meta,
    }


def classify_doc_type(title: str, categories: list[str], content: str) -> str:
    """Classify the document type based on title and content."""
    title_lower = title.lower()
    content_lower = content.lower()[:500]

    if "ประกาศ" in title_lower or "announcement" in title_lower:
        return "ANNOUNCEMENT"
    if "คำวินิจฉัย" in title_lower or "ruling" in title_lower:
        return "RULING"
    if "กฎกระทรวง" in title_lower or "ministerial" in title_lower:
        return "MINISTERIAL"
    if "พ.ร.บ." in title_lower or "พ.ร.ก." in title_lower or "law" in title_lower:
        return "LAW"
    if "คำพิพากษา" in title_lower or "court" in title_lower:
        return "COURT_CASE"
    if "ระเบียบ" in title_lower or "regulation" in title_lower:
        return "REGULATION"

    # Check categories
    for cat in categories:
        cat_lower = cat.lower()
        if "ประกาศ" in cat_lower:
            return "ANNOUNCEMENT"
        if "กฎหมาย" in cat_lower:
            return "LAW"

    return "ANNOUNCEMENT"  # Default for ecs-support content


def extract_doc_number(title: str, content: str) -> str | None:
    """Extract document number from title or content."""
    # Pattern: ที่ XXX/XXXX or เลขที่ XXX/XXXX
    patterns = [
        r"ที่\s*(\d+/\d{4})",
        r"ฉบับที่\s*(\d+)",
        r"ประกาศ.*?(\d+/\d{4})",
        r"No\.\s*(\d+/\d{4})",
    ]

    for pattern in patterns:
        match = re.search(pattern, title + " " + content[:300])
        if match:
            return match.group(1)

    return None


def extract_hs_codes(content: str) -> list[str]:
    """Extract HS codes mentioned in the content."""
    # Pattern: 4 digits, optionally followed by .XX.XX
    pattern = r"\b(\d{4}\.\d{2}(?:\.\d{2,4})?)\b"
    codes = re.findall(pattern, content)
    return list(set(codes))


def parse_date(date_str: str) -> str | None:
    """Parse various date formats into YYYY-MM-DD."""
    if not date_str:
        return None

    # Try ISO format first
    for fmt in ["%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S",
                "%d/%m/%Y", "%d-%m-%Y"]:
        try:
            dt = datetime.strptime(date_str.strip()[:19], fmt)
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            continue

    return None


def upsert_regulation(conn, record: dict) -> bool:
    """Insert or update a regulation."""
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO cg_regulations
                (doc_type, doc_number, title, issuer, issued_date,
                 content, source_url, effective_date, related_hs_codes, tags,
                 updated_at)
            VALUES
                (%(doc_type)s, %(doc_number)s, %(title)s, %(issuer)s, %(issued_date)s,
                 %(content)s, %(source_url)s, %(effective_date)s, %(related_hs_codes)s, %(tags)s,
                 NOW())
            ON CONFLICT ON CONSTRAINT cg_regulations_pkey DO NOTHING
        """, record)
    conn.commit()
    return True


def main():
    conn = get_db_conn()
    tracker = StateTracker(conn, "05_parse_ecs_regulations")

    manifest_path = os.path.join(INPUT_DIR, "_manifest.json")
    if not os.path.exists(manifest_path):
        print(f"ERROR: No manifest found at {manifest_path}")
        print("Run 00_collect_raw_data.py first!")
        sys.exit(1)

    with open(manifest_path, "r") as f:
        posts = json.load(f)

    print(f"Found {len(posts)} regulation posts")
    inserted = 0
    skipped = 0

    for post_info in posts:
        filepath = post_info["local_path"]
        source_url = post_info["source_url"]
        rel_path = post_info["relative_path"]
        source_key = f"ecs:{rel_path}"

        if tracker.is_processed(source_key):
            skipped += 1
            continue

        if not os.path.exists(filepath):
            tracker.mark_skipped(source_key, "file not found")
            continue

        try:
            parsed = parse_html_post(filepath)
            if not parsed:
                tracker.mark_skipped(source_key, "empty or too short")
                continue

            doc_type = classify_doc_type(
                parsed["title"], parsed["categories"], parsed["content"]
            )
            doc_number = extract_doc_number(parsed["title"], parsed["content"])
            hs_codes = extract_hs_codes(parsed["content"])
            issued_date = parse_date(parsed["date_str"])

            record = {
                "doc_type": doc_type,
                "doc_number": doc_number,
                "title": parsed["title"] or os.path.basename(filepath),
                "issuer": "กรมศุลกากร",
                "issued_date": issued_date,
                "content": parsed["content"],
                "source_url": source_url,
                "effective_date": issued_date,
                "related_hs_codes": hs_codes if hs_codes else None,
                "tags": parsed["tags"] if parsed["tags"] else None,
            }

            upsert_regulation(conn, record)
            tracker.mark_processed(source_key, f"type={doc_type}, hs_codes={len(hs_codes)}")
            inserted += 1

        except Exception as e:
            print(f"  ERROR {rel_path}: {e}")
            tracker.mark_failed(source_key, str(e))

    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM cg_regulations")
        total = cur.fetchone()[0]
        cur.execute("SELECT doc_type, COUNT(*) FROM cg_regulations GROUP BY doc_type")
        by_type = cur.fetchall()

    print(f"\n{'='*40}")
    print(f"This run: {inserted} inserted, {skipped} skipped")
    print(f"Total regulations in DB: {total}")
    for doc_type, count in by_type:
        print(f"  {doc_type}: {count}")
    print(f"Progress: {tracker.get_progress()}")

    conn.close()


if __name__ == "__main__":
    main()
