"""
Collector: excise.go.th — อัตราภาษีสรรพสามิตสำหรับสินค้านำเข้า

กรมสรรพสามิต: ภาษีเพิ่มเติมสำหรับสินค้าเฉพาะกลุ่ม
เช่น รถยนต์, แบตเตอรี่, เครื่องดื่ม, บุหรี่, สุรา, น้ำหอม

ศุลกากรเก็บภาษีสรรพสามิตแทนตอนนำเข้า
ถ้าไม่มีข้อมูลนี้ = คำนวณภาษีรวมผิด

Provenance: source_url = https://www.excise.go.th/...
"""

import os
import sys
import json
import requests
from bs4 import BeautifulSoup

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from config import RAW_DIR

OUTPUT_DIR = os.path.join(RAW_DIR, "excise-tax")
BASE_URL = "https://www.excise.go.th"

SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": "Mozilla/5.0 (compatible; CustomsGuard-DataPipeline/1.0)",
    "Accept": "text/html, */*",
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


def scrape_excise_main_page() -> str:
    """Fetch and save the main excise rates page."""
    known_urls = [
        f"{BASE_URL}/cs/groups/public/documents/document/dwnt/mza3/~edisp/uatucm461365.pdf",
        f"{BASE_URL}/excise-tax-rate",
        f"{BASE_URL}/th/tax-rate.html",
    ]

    for url in known_urls:
        try:
            resp = SESSION.get(url, timeout=30)
            if resp.ok:
                filepath = os.path.join(OUTPUT_DIR, "main_page.html")
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(resp.text)
                print(f"[excise] Saved main page from {url}")
                return resp.text
        except Exception:
            continue

    # Try the base URL
    try:
        resp = SESSION.get(BASE_URL, timeout=30)
        if resp.ok:
            return resp.text
    except Exception:
        pass

    return ""


def find_rate_documents(html: str) -> list[dict]:
    """Extract links to rate documents from HTML."""
    if not html:
        return []

    soup = BeautifulSoup(html, "lxml")
    docs = []

    for link in soup.find_all("a", href=True):
        href = link["href"]
        text = link.get_text(strip=True)

        # Look for rate-related documents
        if any(term in text.lower() or term in href.lower()
               for term in ["อัตรา", "ภาษี", "rate", "tax", "พิกัด"]):
            full_url = href if href.startswith("http") else f"{BASE_URL}{href}"
            docs.append({
                "name": text,
                "url": full_url,
                "is_pdf": href.lower().endswith(".pdf"),
            })

    return docs


def collect():
    """Main entry point: scrape excise tax rate data."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print("[excise] Scraping excise.go.th...")

    # Get main page
    html = scrape_excise_main_page()

    # Find rate documents
    docs = find_rate_documents(html)
    print(f"[excise] Found {len(docs)} rate documents")

    # Download PDFs
    pdf_dir = os.path.join(OUTPUT_DIR, "pdfs")
    os.makedirs(pdf_dir, exist_ok=True)

    for doc in docs:
        if doc["is_pdf"]:
            filename = os.path.basename(doc["url"]).split("?")[0]
            filepath = os.path.join(pdf_dir, filename)
            if os.path.exists(filepath):
                continue
            try:
                resp = SESSION.get(doc["url"], timeout=120, stream=True)
                resp.raise_for_status()
                with open(filepath, "wb") as f:
                    for chunk in resp.iter_content(8192):
                        f.write(chunk)
                print(f"  Downloaded: {filename}")
            except Exception as e:
                print(f"  Error: {filename}: {e}")

    # Save manifest
    manifest = {
        "categories": EXCISE_CATEGORIES,
        "documents_found": docs,
        "source": BASE_URL,
    }
    with open(os.path.join(OUTPUT_DIR, "_manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    print(f"\n[excise] Data saved to {OUTPUT_DIR}")
    return OUTPUT_DIR


if __name__ == "__main__":
    collect()
