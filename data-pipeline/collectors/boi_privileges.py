"""
Collector: boi.go.th — BOI Investment Privileges

สำนักงานคณะกรรมการส่งเสริมการลงทุน (BOI)
สิทธิประโยชน์ยกเว้น/ลดหย่อนอากรนำเข้าเครื่องจักร (ม.28/29) และวัตถุดิบ (ม.36)

โรงงานในไทยเกินครึ่งใช้สิทธิ์ BOI
ถ้า AI แนะนำได้ว่า "สินค้านี้ถ้าได้ BOI จะยกเว้นภาษี" = ดูเป็น AI ราคาแพง

Provenance: source_url = https://www.boi.go.th/...
"""

import os
import sys
import json
import requests
from bs4 import BeautifulSoup

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from config import RAW_DIR

OUTPUT_DIR = os.path.join(RAW_DIR, "boi")
BASE_URL = "https://www.boi.go.th"

SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": "Mozilla/5.0 (compatible; CustomsGuard-DataPipeline/1.0)",
    "Accept": "text/html, application/json, */*",
    "Accept-Language": "th,en;q=0.9",
})

KNOWN_PAGES = [
    {
        "name": "ประเภทกิจการที่ส่งเสริม",
        "urls": [
            f"{BASE_URL}/th/index/",
            f"{BASE_URL}/th/incentive_tax/",
        ],
    },
    {
        "name": "สิทธิประโยชน์ทางภาษี",
        "urls": [
            f"{BASE_URL}/th/incentive_detail/",
        ],
    },
]


def scrape_boi_pages() -> list[dict]:
    """Scrape BOI website for privilege information."""
    results = []

    # Try known URLs
    all_urls = set()
    for page in KNOWN_PAGES:
        all_urls.update(page["urls"])

    for url in all_urls:
        try:
            resp = SESSION.get(url, timeout=30)
            if resp.ok:
                soup = BeautifulSoup(resp.text, "lxml")

                # Save HTML
                safe_name = url.split("/")[-2] or "index"
                filepath = os.path.join(OUTPUT_DIR, f"page_{safe_name}.html")
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(resp.text)

                # Extract PDFs
                pdfs = []
                for link in soup.find_all("a", href=True):
                    href = link["href"]
                    if href.endswith(".pdf"):
                        full_url = href if href.startswith("http") else f"{BASE_URL}{href}"
                        pdfs.append({
                            "name": link.get_text(strip=True),
                            "url": full_url,
                        })

                # Extract tables
                tables = []
                for table in soup.find_all("table"):
                    rows = []
                    for tr in table.find_all("tr"):
                        cells = [td.get_text(strip=True) for td in tr.find_all(["td", "th"])]
                        if cells:
                            rows.append(cells)
                    if rows:
                        tables.append(rows)

                results.append({
                    "url": url,
                    "pdfs": pdfs,
                    "tables": tables,
                })
                print(f"[boi] Scraped: {url} (PDFs: {len(pdfs)}, Tables: {len(tables)})")
        except Exception as e:
            print(f"[boi] Error scraping {url}: {e}")

    return results


def download_pdfs(results: list[dict]):
    """Download all found PDFs."""
    pdf_dir = os.path.join(OUTPUT_DIR, "pdfs")
    os.makedirs(pdf_dir, exist_ok=True)

    seen_urls = set()
    for result in results:
        for pdf in result.get("pdfs", []):
            if pdf["url"] in seen_urls:
                continue
            seen_urls.add(pdf["url"])

            filename = os.path.basename(pdf["url"]).split("?")[0]
            filepath = os.path.join(pdf_dir, filename)
            if os.path.exists(filepath):
                continue

            try:
                resp = SESSION.get(pdf["url"], timeout=120, stream=True)
                resp.raise_for_status()
                with open(filepath, "wb") as f:
                    for chunk in resp.iter_content(8192):
                        f.write(chunk)
                print(f"  Downloaded: {filename}")
            except Exception as e:
                print(f"  Error: {filename}: {e}")


def collect():
    """Main entry point: scrape BOI privilege data."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print("[boi] Scraping boi.go.th...")
    results = scrape_boi_pages()

    print("[boi] Downloading PDFs...")
    download_pdfs(results)

    # Save manifest
    manifest = {
        "pages_scraped": len(results),
        "source": BASE_URL,
    }
    with open(os.path.join(OUTPUT_DIR, "_manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    print(f"\n[boi] Data saved to {OUTPUT_DIR}")
    return OUTPUT_DIR


if __name__ == "__main__":
    collect()
