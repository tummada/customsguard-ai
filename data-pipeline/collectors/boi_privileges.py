"""
Collector: boi.go.th — BOI Investment Privileges

สำนักงานคณะกรรมการส่งเสริมการลงทุน (BOI)
สิทธิประโยชน์ยกเว้น/ลดหย่อนอากรนำเข้าเครื่องจักร (ม.28/29) และวัตถุดิบ (ม.36)

โรงงานในไทยเกินครึ่งใช้สิทธิ์ BOI
ถ้า AI แนะนำได้ว่า "สินค้านี้ถ้าได้ BOI จะยกเว้นภาษี" = ดูเป็น AI ราคาแพง

Provenance: source_url = https://www.boi.go.th/...

Note: boi.go.th is behind Incapsula WAF with hCaptcha.
      Plain requests/headless browsers get blocked (~960 bytes challenge page).
      This collector uses Playwright in headed mode with stealth plugin
      to pass the Incapsula JS challenge automatically.
"""

import os
import sys
import json
import time
import requests
from urllib.parse import urlparse, unquote

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from config import RAW_DIR

OUTPUT_DIR = os.path.join(RAW_DIR, "boi")
BASE_URL = "https://www.boi.go.th"

# Pages to scrape — discovered from the actual BOI site navigation.
# The site uses index.php?page= routing, NOT /th/incentive_tax/ paths.
KNOWN_PAGES = [
    {
        "name": "หลักเกณฑ์ส่งเสริมการลงทุนและสิทธิประโยชน์",
        "url": f"{BASE_URL}/index.php?page=criteria_for_project_approval2",
    },
    {
        "name": "หลักเกณฑ์การอนุมัติโครงการ",
        "url": f"{BASE_URL}/index.php?page=criteria_for_project_approval",
    },
    {
        "name": "ประกาศคณะกรรมการส่งเสริมการลงทุน",
        "url": f"{BASE_URL}/index.php?page=boi_announcements_",
    },
    {
        "name": "กฏหมาย ระเบียบ และประกาศ",
        "url": f"{BASE_URL}/index.php?page=boi_announcements",
    },
    {
        "name": "การใช้สิทธิและประโยชน์",
        "url": f"{BASE_URL}/index.php?page=after_promo_benefit1",
    },
    {
        "name": "หน้าแรก",
        "url": f"{BASE_URL}/th/index/",
    },
]

# Max PDFs to download per run (to avoid overwhelming the server)
MAX_PDF_DOWNLOADS = 50


def _wait_for_real_content(page, max_wait=30):
    """
    Wait until Incapsula JS challenge resolves and real content loads.
    Returns HTML string if successful, None if still blocked.
    """
    for _ in range(max_wait):
        try:
            content = page.content()
            # Real BOI pages are >5KB; Incapsula challenge is ~960 bytes
            if len(content) > 5000 and "incapsula" not in content.lower()[:2000]:
                return content
        except Exception:
            pass
        time.sleep(1)
    return None


def _extract_pdfs_from_page(page):
    """Extract all PDF links from the current page DOM."""
    try:
        return page.eval_on_selector_all(
            "a[href*='.pdf']",
            """els => els.map(e => ({
                name: e.textContent.trim().substring(0, 200),
                url: e.href
            })).filter(p => p.url)"""
        )
    except Exception:
        return []


def _extract_tables_from_page(page):
    """Extract all tables from the current page DOM."""
    try:
        return page.eval_on_selector_all(
            "table",
            """els => els.map(table => {
                const rows = [];
                for (const tr of table.querySelectorAll('tr')) {
                    const cells = [];
                    for (const td of tr.querySelectorAll('td, th')) {
                        cells.push(td.textContent.trim());
                    }
                    if (cells.length > 0) rows.push(cells);
                }
                return rows;
            }).filter(t => t.length > 0)"""
        )
    except Exception:
        return []


def _extract_privilege_links(page):
    """Extract links related to BOI privileges for further crawling."""
    try:
        return page.eval_on_selector_all(
            "a[href]",
            """els => els.map(e => ({
                text: e.textContent.trim().substring(0, 100),
                href: e.href
            })).filter(l =>
                l.text && l.href.includes('boi.go.th') && (
                    l.href.includes('incentive') ||
                    l.href.includes('privilege') ||
                    l.href.includes('criteria') ||
                    l.href.includes('benefit') ||
                    l.href.includes('announcement') ||
                    l.text.includes('สิทธิ') ||
                    l.text.includes('ยกเว้น') ||
                    l.text.includes('ลดหย่อน') ||
                    l.text.includes('ประกาศ') ||
                    l.text.includes('มาตรา') ||
                    l.text.includes('หลักเกณฑ์')
                )
            )"""
        )
    except Exception:
        return []


def scrape_boi_pages() -> list[dict]:
    """
    Scrape BOI website using Playwright in headed mode with stealth.

    Headed mode is required because boi.go.th uses Incapsula WAF
    which blocks headless browsers even with stealth patches.
    The Incapsula JS challenge auto-resolves in headed mode (~10-15s).
    """
    from playwright.sync_api import sync_playwright
    from playwright_stealth import Stealth

    results = []

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=False,
            args=["--disable-blink-features=AutomationControlled"],
        )
        context = browser.new_context(
            user_agent=(
                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
                "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1920, "height": 1080},
            locale="th-TH",
        )
        stealth = Stealth()
        stealth.apply_stealth_sync(context)
        page = context.new_page()

        # Visit index first to establish Incapsula session cookies
        print("[boi] Establishing Incapsula session...")
        try:
            page.goto(f"{BASE_URL}/th/index/", timeout=60000, wait_until="commit")
            content = _wait_for_real_content(page, max_wait=30)
            if content:
                print(f"[boi] Session established ({len(content)} bytes)")
            else:
                print("[boi] WARNING: Could not establish session, continuing anyway...")
        except Exception as e:
            print(f"[boi] WARNING: Index page error: {e}")

        # Scrape each target page
        for entry in KNOWN_PAGES:
            url = entry["url"]
            name = entry["name"]
            print(f"\n[boi] Scraping: {name}")
            print(f"      URL: {url}")

            try:
                page.goto(url, timeout=60000, wait_until="commit")
                content = _wait_for_real_content(page, max_wait=30)

                if not content:
                    print(f"[boi] SKIP: Could not load page (blocked or timeout)")
                    continue

                # Save HTML
                safe_name = urlparse(url).query.replace("page=", "") or urlparse(url).path.strip("/").replace("/", "_") or "index"
                filepath = os.path.join(OUTPUT_DIR, f"page_{safe_name}.html")
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(content)

                # Extract data
                pdfs = _extract_pdfs_from_page(page)
                tables = _extract_tables_from_page(page)
                priv_links = _extract_privilege_links(page)

                results.append({
                    "name": name,
                    "url": url,
                    "html_file": filepath,
                    "content_length": len(content),
                    "pdfs": pdfs,
                    "tables": tables,
                    "privilege_links": priv_links,
                })
                print(f"[boi] OK: {len(content)} bytes, "
                      f"PDFs: {len(pdfs)}, Tables: {len(tables)}, "
                      f"Related links: {len(priv_links)}")

            except Exception as e:
                print(f"[boi] ERROR scraping {url}: {e}")

        # Export cookies for PDF downloads via requests
        cookies = {}
        for c in context.cookies():
            cookies[c["name"]] = c["value"]

        browser.close()

    return results, cookies


def download_pdfs(results: list[dict], cookies: dict):
    """
    Download PDF files found on scraped pages.
    Uses requests with Incapsula session cookies from the browser.
    """
    pdf_dir = os.path.join(OUTPUT_DIR, "pdfs")
    os.makedirs(pdf_dir, exist_ok=True)

    # Collect unique PDF URLs
    seen_urls = set()
    all_pdfs = []
    for result in results:
        for pdf in result.get("pdfs", []):
            url = pdf["url"]
            if url not in seen_urls:
                seen_urls.add(url)
                all_pdfs.append(pdf)

    if not all_pdfs:
        print("[boi] No PDFs found to download")
        return

    # Limit downloads
    if len(all_pdfs) > MAX_PDF_DOWNLOADS:
        print(f"[boi] Found {len(all_pdfs)} PDFs, downloading first {MAX_PDF_DOWNLOADS}")
        all_pdfs = all_pdfs[:MAX_PDF_DOWNLOADS]
    else:
        print(f"[boi] Downloading {len(all_pdfs)} PDFs...")

    session = requests.Session()
    session.headers.update({
        "User-Agent": (
            "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        ),
        "Referer": BASE_URL,
    })
    session.cookies.update(cookies)

    downloaded = 0
    skipped = 0
    errors = 0

    for pdf in all_pdfs:
        url = pdf["url"]
        # Generate filename from URL path, decode percent-encoding
        raw_name = os.path.basename(urlparse(url).path).split("?")[0]
        filename = unquote(raw_name) if raw_name else f"unknown_{hash(url) % 10000}.pdf"

        filepath = os.path.join(pdf_dir, filename)
        if os.path.exists(filepath):
            skipped += 1
            continue

        try:
            resp = session.get(url, timeout=120, stream=True)
            resp.raise_for_status()

            # Verify it's actually a PDF (not an Incapsula challenge)
            content_type = resp.headers.get("Content-Type", "")
            first_chunk = None
            with open(filepath, "wb") as f:
                for chunk in resp.iter_content(8192):
                    if first_chunk is None:
                        first_chunk = chunk
                    f.write(chunk)

            # Check if downloaded file is actually a PDF
            if first_chunk and not first_chunk.startswith(b"%PDF"):
                os.remove(filepath)
                print(f"  SKIP (not PDF): {filename}")
                errors += 1
                continue

            downloaded += 1
            print(f"  OK: {filename} ({pdf['name'][:50]})")

        except Exception as e:
            errors += 1
            print(f"  ERROR: {filename}: {e}")

    print(f"\n[boi] PDFs: {downloaded} downloaded, {skipped} skipped (exist), {errors} errors")


def collect():
    """Main entry point: scrape BOI privilege data."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print("[boi] Scraping boi.go.th (Playwright headed + stealth)...")
    print("[boi] A browser window will open briefly to pass Incapsula WAF.")
    results, cookies = scrape_boi_pages()

    print(f"\n[boi] Downloading PDFs (max {MAX_PDF_DOWNLOADS})...")
    download_pdfs(results, cookies)

    # Save manifest
    manifest = {
        "pages_scraped": len(results),
        "source": BASE_URL,
        "method": "playwright-headed-stealth",
        "note": "boi.go.th uses Incapsula WAF + hCaptcha; headed browser required",
        "pages": [
            {
                "name": r["name"],
                "url": r["url"],
                "content_length": r["content_length"],
                "pdf_count": len(r["pdfs"]),
                "table_count": len(r["tables"]),
            }
            for r in results
        ],
        "total_pdfs_found": sum(len(r["pdfs"]) for r in results),
    }
    with open(os.path.join(OUTPUT_DIR, "_manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    print(f"\n[boi] Data saved to {OUTPUT_DIR}")
    return OUTPUT_DIR


if __name__ == "__main__":
    collect()
