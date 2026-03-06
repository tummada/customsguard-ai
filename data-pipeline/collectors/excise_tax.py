"""
Collector: excise.go.th — อัตราภาษีสรรพสามิตสำหรับสินค้านำเข้า

กรมสรรพสามิต: ภาษีเพิ่มเติมสำหรับสินค้าเฉพาะกลุ่ม
เช่น รถยนต์, แบตเตอรี่, เครื่องดื่ม, บุหรี่, สุรา, น้ำหอม

ศุลกากรเก็บภาษีสรรพสามิตแทนตอนนำเข้า
ถ้าไม่มีข้อมูลนี้ = คำนวณภาษีรวมผิด

Website structure (updated 2026-03):
  - Main site: https://www.excise.go.th → redirects to /excise → /excise2017/index.htm
  - Tax rate overview (HTM): /cs/groups/public/documents/document/dwnt/mze5/~edisp/uatucm319919.htm
  - Tax rate overview (PDF): /cs/groups/public/documents/document/dwnt/mjk5/~edisp/uatucm299858.pdf
  - Law portal (AJAX, needs JS): https://lawelcs.excise.go.th/
  - Act 2560 law PDF: http://webdev.excise.go.th/act2560/files/law.pdf

Provenance: source_url = https://www.excise.go.th/...
"""

import os
import sys
import json
import re
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from config import RAW_DIR

OUTPUT_DIR = os.path.join(RAW_DIR, "excise-tax")
BASE_URL = "https://www.excise.go.th"

SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": "Mozilla/5.0 (compatible; CustomsGuard-DataPipeline/1.0)",
    "Accept": "text/html, application/pdf, */*",
    "Accept-Language": "th,en;q=0.9",
})

# Excise tax categories and their known URLs
EXCISE_CATEGORIES = [
    {
        "name": "รถยนต์",
        "name_en": "Automobiles",
        "search_terms": ["รถยนต์", "automobile", "motor vehicle"],
    },
    {
        "name": "รถจักรยานยนต์",
        "name_en": "Motorcycles",
        "search_terms": ["จักรยานยนต์", "motorcycle"],
    },
    {
        "name": "แบตเตอรี่",
        "name_en": "Batteries",
        "search_terms": ["แบตเตอรี่", "battery"],
    },
    {
        "name": "เครื่องดื่ม",
        "name_en": "Beverages",
        "search_terms": ["เครื่องดื่ม", "beverage"],
    },
    {
        "name": "สุราและเบียร์",
        "name_en": "Alcohol and Beer",
        "search_terms": ["สุรา", "เบียร์", "alcohol"],
    },
    {
        "name": "ยาสูบ/บุหรี่",
        "name_en": "Tobacco",
        "search_terms": ["ยาสูบ", "บุหรี่", "tobacco"],
    },
    {
        "name": "น้ำหอม/เครื่องสำอาง",
        "name_en": "Perfume/Cosmetics",
        "search_terms": ["น้ำหอม", "เครื่องสำอาง", "perfume"],
    },
    {
        "name": "เรือ/Yacht",
        "name_en": "Boats/Yachts",
        "search_terms": ["เรือ", "yacht"],
    },
    {
        "name": "สนามกอล์ฟ/สนามแข่ง",
        "name_en": "Golf/Racing",
        "search_terms": ["สนามกอล์ฟ", "golf"],
    },
    {
        "name": "ผลิตภัณฑ์ปิโตรเลียม",
        "name_en": "Petroleum Products",
        "search_terms": ["น้ำมัน", "ปิโตรเลียม", "petroleum"],
    },
]

# --- Updated URL map (2026-03) ---
# The site restructured under /excise2017/ with Oracle WebCenter CMS paths.
# Old paths like /excise-tax-rate and /th/tax-rate.html now 404.
# Content is served via /cs/groups/public/documents/... and /excise2017/...

# Primary pages to scrape for links and content
ENTRY_PAGES = [
    # Excise Act 2560 — tax rate overview (has links to all product-specific rate PDFs)
    f"{BASE_URL}/cs/groups/public/documents/document/dwnt/mze5/~edisp/uatucm319919.htm",
    # Main portal homepage (has recent announcements + PDF links)
    f"{BASE_URL}/excise2017/index.htm",
    # Tax knowledge page
    f"{BASE_URL}/excise2017/article/TAX_KNOW/index.htm",
    # Goods knowledge page
    f"{BASE_URL}/excise2017/article/TAX_COLLECTING_CONCEPT/GOODS_KNOW/index.htm",
]

# Known high-value PDFs (verified accessible 2026-03-06)
KNOWN_PDFS = [
    {
        "name": "กำหนดประเภทสินค้าตามพิกัดอัตราภาษีสรรพสามิต พ.ศ. 2560",
        "name_en": "Excise Tariff Classification Act 2560",
        "url": f"{BASE_URL}/cs/groups/public/documents/document/dwnt/mjk5/~edisp/uatucm299858.pdf",
    },
    {
        "name": "กฎกระทรวงกำหนดพิกัดอัตราภาษีสรรพสามิต พ.ศ. 2560",
        "name_en": "Ministerial Regulation: Excise Tax Rates 2560",
        "url": "http://www.ratchakitcha.soc.go.th/DATA/PDF/2560/A/095/111.PDF",
    },
    {
        "name": "กฎกระทรวงกำหนดพิกัดอัตราภาษีสรรพสามิต (ฉบับที่ 2) พ.ศ. 2560",
        "name_en": "Ministerial Regulation: Excise Tax Rates (No.2) 2560",
        "url": "http://www.ratchakitcha.soc.go.th/DATA/PDF/2560/A/095/113.PDF",
    },
    {
        "name": "กฎกระทรวงกำหนดพิกัดอัตราภาษีสรรพสามิต (ฉบับที่ 3) พ.ศ. 2560",
        "name_en": "Ministerial Regulation: Excise Tax Rates (No.3) 2560",
        "url": f"{BASE_URL}/cs/groups/public/documents/document/dwnt/mjk5/~edisp/uatucm299915.pdf",
    },
    {
        "name": "กฎกระทรวงกำหนดพิกัดอัตราภาษีสรรพสามิต (ฉบับที่ 4) พ.ศ. 2561",
        "name_en": "Ministerial Regulation: Excise Tax Rates (No.4) 2561",
        "url": f"{BASE_URL}/cs/groups/public/documents/document/dwnt/mze5/~edisp/uatucm319917.pdf",
    },
    {
        "name": "ร่างกฏกระทรวงการอนุญาตผลิตสุรา (พ.ร.บ. 2560)",
        "name_en": "Draft: Ministerial Regulation on Liquor Production (Act 2560)",
        "url": "http://webdev.excise.go.th/act2560/files/law.pdf",
    },
    {
        "name": "คู่มือขั้นตอนการขอรับสิทธิเสียภาษีอัตราร้อยละศูนย์ (น้ำผลไม้/น้ำพืชผัก)",
        "name_en": "Zero-Rate Guide: Fruit/Vegetable Juice Beverages",
        "url": f"{BASE_URL}/cs/groups/public/documents/document/dwnt/mzyx/~edisp/uatucm361128.pdf",
    },
    {
        "name": "กฎหมายภาษีสรรพสามิตเกี่ยวกับการผลิตสุรา",
        "name_en": "Excise Tax Law: Liquor Production",
        "url": f"{BASE_URL}/cs/groups/public/documents/document/dwnt/njiw/~edisp/uatucm620913.pdf",
    },
    {
        "name": "สรุปหลักเกณฑ์การผลิตสุรา",
        "name_en": "Summary: Liquor Production Criteria",
        "url": f"{BASE_URL}/cs/groups/public/documents/document/dwnt/njiw/~edisp/uatucm620919.pdf",
    },
]


def scrape_entry_pages() -> list[dict]:
    """Fetch entry pages and extract all rate-related document links."""
    all_docs = []
    seen_urls = set()

    for page_url in ENTRY_PAGES:
        print(f"[excise] Fetching: {page_url}")
        try:
            resp = SESSION.get(page_url, timeout=30)
            if not resp.ok:
                print(f"  HTTP {resp.status_code} — skipping")
                continue
        except Exception as e:
            print(f"  Error: {e} — skipping")
            continue

        html = resp.text

        # Save the page
        safe_name = re.sub(r'[^\w\-.]', '_', page_url.split("/")[-1] or "index.htm")
        filepath = os.path.join(OUTPUT_DIR, f"page_{safe_name}")
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(html)

        # Extract links
        soup = BeautifulSoup(html, "html.parser")
        for link in soup.find_all("a", href=True):
            href = link["href"].strip()
            text = link.get_text(strip=True)

            # Skip empty, anchors, mailto, javascript
            if not href or href.startswith(("#", "mailto:", "javascript:")):
                continue

            # Resolve relative URLs
            if href.startswith("//"):
                full_url = "https:" + href
            elif href.startswith("/"):
                full_url = BASE_URL + href
            elif not href.startswith("http"):
                full_url = urljoin(page_url, href)
            else:
                full_url = href

            # Fix ratchakitcha backslash URLs
            full_url = full_url.replace("\\", "/")

            is_pdf = full_url.lower().endswith(".pdf") or ".pdf" in full_url.lower()

            # Only collect rate/tax-related documents or PDFs
            combined = (text + " " + full_url).lower()
            is_rate_related = any(
                term in combined
                for term in [
                    "อัตรา", "ภาษี", "rate", "tax", "พิกัด",
                    "สินค้า", "กฎกระทรวง", "ministerial",
                    "สุรา", "ยาสูบ", "รถยนต์", "เครื่องดื่ม",
                    "แบตเตอรี่", "น้ำมัน", "ปิโตรเลียม",
                ]
            )

            if is_pdf or is_rate_related:
                if full_url not in seen_urls:
                    seen_urls.add(full_url)
                    all_docs.append({
                        "name": text[:200] if text else os.path.basename(full_url),
                        "url": full_url,
                        "is_pdf": is_pdf,
                        "source_page": page_url,
                    })

    return all_docs


def download_pdf(url: str, pdf_dir: str) -> str | None:
    """Download a single PDF. Returns the local file path or None on failure."""
    # Derive filename from URL
    basename = os.path.basename(url.split("?")[0])
    if not basename or len(basename) < 3:
        basename = re.sub(r'[^\w\-.]', '_', url[-60:]) + ".pdf"
    filepath = os.path.join(pdf_dir, basename)

    if os.path.exists(filepath):
        print(f"  Already exists: {basename}")
        return filepath

    try:
        resp = SESSION.get(url, timeout=120, stream=True)
        resp.raise_for_status()

        # Verify it's actually a PDF (check content-type or magic bytes)
        content_type = resp.headers.get("Content-Type", "")
        first_chunk = None
        chunks = []
        for chunk in resp.iter_content(8192):
            if first_chunk is None:
                first_chunk = chunk
            chunks.append(chunk)

        if first_chunk and not first_chunk[:5].startswith(b"%PDF") and "pdf" not in content_type.lower():
            print(f"  Not a PDF (content-type={content_type}): {basename}")
            return None

        with open(filepath, "wb") as f:
            for chunk in chunks:
                f.write(chunk)

        size_kb = os.path.getsize(filepath) / 1024
        print(f"  Downloaded: {basename} ({size_kb:.0f} KB)")
        return filepath

    except Exception as e:
        print(f"  Error downloading {basename}: {e}")
        return None


def collect():
    """Main entry point: scrape excise tax rate data."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print("[excise] Scraping excise.go.th (updated 2026-03 structure)...")
    print(f"[excise] Output: {OUTPUT_DIR}")

    # Step 1: Scrape entry pages for document links
    discovered_docs = scrape_entry_pages()
    print(f"[excise] Discovered {len(discovered_docs)} rate-related documents from entry pages")

    # Step 2: Merge with known high-value PDFs (dedup by URL)
    seen_urls = {d["url"] for d in discovered_docs}
    for known in KNOWN_PDFS:
        if known["url"] not in seen_urls:
            seen_urls.add(known["url"])
            discovered_docs.append({
                "name": known["name"],
                "name_en": known.get("name_en", ""),
                "url": known["url"],
                "is_pdf": True,
                "source_page": "known_pdfs",
            })

    all_pdfs = [d for d in discovered_docs if d["is_pdf"]]
    print(f"[excise] Total PDFs to download: {len(all_pdfs)}")

    # Step 3: Download PDFs
    pdf_dir = os.path.join(OUTPUT_DIR, "pdfs")
    os.makedirs(pdf_dir, exist_ok=True)

    downloaded = 0
    failed = 0
    for doc in all_pdfs:
        result = download_pdf(doc["url"], pdf_dir)
        if result:
            doc["local_path"] = result
            downloaded += 1
        else:
            failed += 1

    print(f"[excise] PDFs: {downloaded} downloaded, {failed} failed")

    # Step 4: Save manifest
    manifest = {
        "categories": EXCISE_CATEGORIES,
        "documents_found": discovered_docs,
        "pdfs_downloaded": downloaded,
        "pdfs_failed": failed,
        "source": BASE_URL,
        "entry_pages": ENTRY_PAGES,
        "note": (
            "Site restructured under /excise2017/ (Oracle WebCenter CMS). "
            "Old URLs (/excise-tax-rate, /th/tax-rate.html) return 404. "
            "Law portal (lawelcs.excise.go.th) requires JavaScript/AJAX — not scraped. "
            "Tax rate PDFs collected from entry pages + known URLs."
        ),
    }
    manifest_path = os.path.join(OUTPUT_DIR, "_manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    print(f"\n[excise] Data saved to {OUTPUT_DIR}")
    print(f"[excise] Manifest: {manifest_path}")
    return OUTPUT_DIR


if __name__ == "__main__":
    collect()
