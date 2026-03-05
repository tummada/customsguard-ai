#!/usr/bin/env python3
"""
Script 16: Scrape FTA preferential rates from thailandntr.com

Uses Playwright to handle Vue.js client-side rendering.
Loops through 10 FTA agreements x 97 HS chapters = ~970 pages.

MUST run from a Thai IP (thailandntr.com blocks foreign IPs).

Features:
  - Checkpointing: saves progress.json, resumes from last chapter
  - Random delays: 2-5s between pages to avoid WAF detection
  - playwright-stealth: anti-detection for headless mode
  - HS code normalizer: matches NTR format to DB 11-digit format

Requirements:
  pip install playwright playwright-stealth
  playwright install chromium
"""

import os
import sys
import json
import asyncio
import random
import re
import time
from datetime import date

sys.path.insert(0, os.path.dirname(__file__))
from config import get_db_conn
from utils.validator import validate_rate, validate_fta_name

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
OUTPUT_DIR = os.path.join(DATA_DIR, "fta_scraped")
PROGRESS_FILE = os.path.join(OUTPUT_DIR, "progress.json")

# FTA agreements on thailandntr.com
FTA_AGREEMENTS = {
    "ATIGA":   {"url_key": "atiga",   "countries": ["ASEAN"], "form": "Form D"},
    "ACFTA":   {"url_key": "acfta",   "countries": ["CHN"],   "form": "Form E"},
    "AKFTA":   {"url_key": "akfta",   "countries": ["KOR"],   "form": "Form AK"},
    "AJCEP":   {"url_key": "ajcep",   "countries": ["JPN"],   "form": "Form AJ"},
    "JTEPA":   {"url_key": "jtepa",   "countries": ["JPN"],   "form": "Form JTEPA"},
    "TAFTA":   {"url_key": "tafta",   "countries": ["AUS"],   "form": "Form TAFTA"},
    "AANZFTA": {"url_key": "aanzfta", "countries": ["AUS", "NZL"], "form": "Form AANZ"},
    "AIFTA":   {"url_key": "aifta",   "countries": ["IND"],   "form": "Form AI"},
    "RCEP":    {"url_key": "rcep",    "countries": ["CHN", "JPN", "KOR", "AUS", "NZL"], "form": "Form RCEP"},
    "TNZCEP":  {"url_key": "tnzcep",  "countries": ["NZL"],   "form": "Form TNZCEP"},
}

# HS chapters: 01-97
HS_CHAPTERS = [f"{i:02d}" for i in range(1, 98)]


def normalize_hs_code_to_db(code_str):
    """
    Normalize NTR HS code to match cg_hs_codes.code format.

    NTR may show: '0306.11', '0306.11.00', '03061100'
    DB stores: '03061100000' (11 digits, zero-padded)

    Returns normalized code or None if invalid.
    """
    if not code_str:
        return None
    # Strip whitespace, remove dots
    digits = re.sub(r"[.\s]", "", code_str.strip())
    # Must be all digits
    if not digits.isdigit():
        return None
    # Must be at least 4 digits
    if len(digits) < 4:
        return None
    # Zero-pad to 11 digits (DB format)
    padded = digits.ljust(11, "0")
    # Truncate if longer than 11
    return padded[:11]


def parse_rate_text(rate_text):
    """
    Parse rate from NTR table cell text.
    Examples: '5%', '5.00', 'Free', '0', 'Prohibited', 'W 7.95/Kg'

    Returns: float rate or None for non-ad-valorem/special rates.
    """
    if not rate_text:
        return None
    text = rate_text.strip().upper()
    if text in ("FREE", "0", "0%", "0.00", "0.00%"):
        return 0.0
    if "PROHIBITED" in text or "PROHIBIT" in text:
        return None  # special case
    # Match percentage: '5%', '5.00%', '5'
    match = re.match(r"^(\d+(?:\.\d+)?)\s*%?$", text)
    if match:
        return float(match.group(1))
    # Non-ad-valorem (W/Kg, specific rates) — skip
    return None


def load_progress():
    """Load checkpoint progress."""
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE, "r") as f:
            return json.load(f)
    return {"completed": {}, "total_rates": 0}


def save_progress(progress):
    """Save checkpoint progress."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    with open(PROGRESS_FILE, "w") as f:
        json.dump(progress, f, indent=2)


async def scrape_fta_chapter(page, fta_name, fta_info, chapter, progress):
    """Scrape a single FTA+chapter page and extract rates."""
    progress_key = f"{fta_name}:{chapter}"

    # Skip if already completed
    if progress_key in progress["completed"]:
        return progress["completed"][progress_key]

    url_key = fta_info["url_key"]
    url = f"https://www.thailandntr.com/en/goods/tariff/search?hs={chapter}&agreement={url_key}"

    rates = []
    try:
        await page.goto(url, wait_until="domcontentloaded", timeout=30000)
        # Wait for Vue.js rendering — look for table data
        try:
            await page.wait_for_selector("table tbody tr", timeout=15000)
        except Exception:
            # No table rows = no data for this chapter under this FTA
            progress["completed"][progress_key] = 0
            save_progress(progress)
            return 0

        # Wait a bit more for full render
        await page.wait_for_timeout(2000)

        # Extract table data
        table_data = await page.evaluate("""() => {
            const rows = document.querySelectorAll('table tbody tr');
            const results = [];
            for (const row of rows) {
                const cells = Array.from(row.querySelectorAll('td'));
                if (cells.length >= 4) {
                    results.push({
                        hs_code: cells[0]?.textContent?.trim() || '',
                        description: cells[1]?.textContent?.trim() || '',
                        mfn_rate: cells[2]?.textContent?.trim() || '',
                        preferential_rate: cells[3]?.textContent?.trim() || '',
                    });
                }
            }
            return results;
        }""")

        for row in table_data:
            hs_code = normalize_hs_code_to_db(row["hs_code"])
            if not hs_code:
                continue

            pref_rate = parse_rate_text(row["preferential_rate"])
            if pref_rate is None:
                continue  # skip non-ad-valorem rates

            valid, msg = validate_rate(pref_rate)
            if not valid:
                continue

            for country in fta_info["countries"]:
                rates.append({
                    "hs_code": hs_code,
                    "fta_name": fta_name,
                    "partner_country": country,
                    "preferential_rate": pref_rate,
                    "form_type": fta_info["form"],
                    "conditions": None,
                    "effective_from": str(date.today().replace(month=1, day=1)),
                    "effective_to": None,
                    "source_url": url,
                })

        # Save chapter results
        if rates:
            chapter_file = os.path.join(OUTPUT_DIR, f"{fta_name}_{chapter}.json")
            with open(chapter_file, "w") as f:
                json.dump(rates, f, ensure_ascii=False, indent=2)

        progress["completed"][progress_key] = len(rates)
        progress["total_rates"] += len(rates)
        save_progress(progress)

    except Exception as e:
        print(f"    ERROR {fta_name} ch.{chapter}: {e}")
        progress["completed"][progress_key] = -1  # mark as failed
        save_progress(progress)
        return -1

    return len(rates)


async def run_scraper(headless=False):
    """Main scraping loop with Playwright."""
    from playwright.async_api import async_playwright

    # Try to use stealth plugin
    try:
        from playwright_stealth import stealth_async
        use_stealth = True
    except ImportError:
        print("WARNING: playwright-stealth not installed. Install with: pip install playwright-stealth")
        use_stealth = False

    progress = load_progress()
    total_pages = len(FTA_AGREEMENTS) * len(HS_CHAPTERS)
    done_count = len([k for k, v in progress["completed"].items() if v >= 0])
    print(f"Progress: {done_count}/{total_pages} pages completed")

    if done_count >= total_pages:
        print("All pages already scraped! Use --force to re-scrape.")
        return

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=headless,
            args=["--disable-blink-features=AutomationControlled"],
        )
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={"width": 1920, "height": 1080},
            locale="th-TH",
        )
        page = await context.new_page()

        if use_stealth:
            await stealth_async(page)

        start_time = time.time()

        for fta_name, fta_info in FTA_AGREEMENTS.items():
            print(f"\n{'='*50}")
            print(f"FTA: {fta_name} ({fta_info['form']})")
            print(f"{'='*50}")

            for chapter in HS_CHAPTERS:
                progress_key = f"{fta_name}:{chapter}"
                if progress_key in progress["completed"] and progress["completed"][progress_key] >= 0:
                    continue  # skip completed

                count = await scrape_fta_chapter(page, fta_name, fta_info, chapter, progress)

                if count >= 0:
                    print(f"  Chapter {chapter}: {count} rates")
                else:
                    print(f"  Chapter {chapter}: FAILED (will retry next run)")

                # Random delay between pages
                delay = random.uniform(2, 5)
                await page.wait_for_timeout(int(delay * 1000))

        await browser.close()

    elapsed = time.time() - start_time
    failed = len([k for k, v in progress["completed"].items() if v < 0])
    print(f"\nScraping complete in {elapsed:.0f}s")
    print(f"Total rates: {progress['total_rates']}")
    print(f"Failed pages: {failed}")
    if failed > 0:
        print("Run again to retry failed pages.")


def insert_to_db():
    """Insert scraped JSON files into cg_fta_rates table."""
    conn = get_db_conn()

    # Collect all JSON files
    json_files = sorted(
        f for f in os.listdir(OUTPUT_DIR)
        if f.endswith(".json") and f != "progress.json"
    )
    if not json_files:
        print("No scraped data files found. Run scraper first.")
        return

    # Get valid HS codes from DB for FK validation
    with conn.cursor() as cur:
        cur.execute("SELECT code FROM cg_hs_codes")
        valid_hs_codes = {row[0] for row in cur.fetchall()}
    print(f"Valid HS codes in DB: {len(valid_hs_codes)}")

    total_inserted = 0
    total_skipped_fk = 0
    total_skipped_dup = 0

    for jf in json_files:
        filepath = os.path.join(OUTPUT_DIR, jf)
        with open(filepath) as f:
            rates = json.load(f)

        inserted = 0
        for rate in rates:
            hs_code = rate["hs_code"]

            # FK validation: HS code must exist in cg_hs_codes
            if hs_code not in valid_hs_codes:
                total_skipped_fk += 1
                continue

            try:
                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO cg_fta_rates
                            (hs_code, fta_name, partner_country, preferential_rate,
                             form_type, conditions, effective_from, effective_to, source_url)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (hs_code, fta_name, partner_country, effective_from)
                        DO UPDATE SET
                            preferential_rate = EXCLUDED.preferential_rate,
                            form_type = EXCLUDED.form_type,
                            source_url = EXCLUDED.source_url,
                            updated_at = CURRENT_TIMESTAMP
                    """, (
                        hs_code,
                        rate["fta_name"],
                        rate["partner_country"],
                        rate["preferential_rate"],
                        rate["form_type"],
                        rate["conditions"],
                        rate["effective_from"],
                        rate["effective_to"],
                        rate["source_url"],
                    ))
                inserted += 1
            except Exception as e:
                if "duplicate" in str(e).lower():
                    total_skipped_dup += 1
                    conn.rollback()
                else:
                    print(f"  ERROR inserting {hs_code}: {e}")
                    conn.rollback()

        conn.commit()
        total_inserted += inserted
        print(f"  {jf}: {inserted} inserted")

    # Verify
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM cg_fta_rates")
        total = cur.fetchone()[0]
        cur.execute("SELECT fta_name, COUNT(*) FROM cg_fta_rates GROUP BY fta_name ORDER BY fta_name")
        by_fta = cur.fetchall()

    print(f"\nTotal FTA rates in DB: {total}")
    print(f"Inserted this run: {total_inserted}")
    print(f"Skipped (no FK match): {total_skipped_fk}")
    print(f"Skipped (duplicate): {total_skipped_dup}")
    print("\nBreakdown by FTA:")
    for fta, count in by_fta:
        print(f"  {fta}: {count}")

    conn.close()


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Scrape FTA rates from thailandntr.com")
    parser.add_argument("action", choices=["scrape", "insert", "status"],
                       help="scrape=run Playwright, insert=load JSONs to DB, status=show progress")
    parser.add_argument("--headless", action="store_true", help="Run browser headless")
    parser.add_argument("--force", action="store_true", help="Re-scrape all pages")
    args = parser.parse_args()

    if args.action == "status":
        progress = load_progress()
        total = len(FTA_AGREEMENTS) * len(HS_CHAPTERS)
        done = len([k for k, v in progress["completed"].items() if v >= 0])
        failed = len([k for k, v in progress["completed"].items() if v < 0])
        print(f"Pages: {done}/{total} completed, {failed} failed")
        print(f"Total rates scraped: {progress.get('total_rates', 0)}")
        return

    if args.action == "scrape":
        if args.force:
            if os.path.exists(PROGRESS_FILE):
                os.remove(PROGRESS_FILE)
                print("Progress reset.")
        asyncio.run(run_scraper(headless=args.headless))
        return

    if args.action == "insert":
        insert_to_db()
        return


if __name__ == "__main__":
    main()
