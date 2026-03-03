"""
Collector: thainsw.net + หน่วยงานควบคุม — ของต้องกำกัด / ใบอนุญาต

National Single Window: ระบบเชื่อมโยงใบอนุญาตนำเข้า-ส่งออก
สินค้าพิกัดไหนต้องขอใบอนุญาตจากหน่วยงานไหน

หน่วยงานหลัก:
- อย. (FDA) — อาหาร ยา เครื่องสำอาง
- สมอ. (TISI) — มาตรฐานผลิตภัณฑ์อุตสาหกรรม
- กสทช. (NBTC) — อุปกรณ์สื่อสาร
- กรมปศุสัตว์ (DLD) — สัตว์และผลิตภัณฑ์สัตว์
- กรมวิชาการเกษตร (DOA) — พืชและผลิตภัณฑ์พืช
- กรมการค้าต่างประเทศ (DFT) — สินค้าควบคุมการนำเข้า-ส่งออก

Provenance: source_url = https://www.thainsw.net/... หรือ URL หน่วยงาน
"""

import os
import sys
import json
import requests
from bs4 import BeautifulSoup

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from config import RAW_DIR

OUTPUT_DIR = os.path.join(RAW_DIR, "lpi-controls")

SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": "Mozilla/5.0 (compatible; CustomsGuard-DataPipeline/1.0)",
    "Accept": "text/html, application/json, */*",
    "Accept-Language": "th,en;q=0.9",
})

# Agency websites to scrape
AGENCIES = [
    {
        "code": "FDA",
        "name_th": "สำนักงานคณะกรรมการอาหารและยา (อย.)",
        "name_en": "Food and Drug Administration",
        "urls": [
            "https://www.fda.moph.go.th",
        ],
        "search_terms": ["ใบอนุญาต", "นำเข้า", "อาหาร", "ยา", "เครื่องสำอาง"],
    },
    {
        "code": "TISI",
        "name_th": "สำนักงานมาตรฐานผลิตภัณฑ์อุตสาหกรรม (สมอ.)",
        "name_en": "Thai Industrial Standards Institute",
        "urls": [
            "https://www.tisi.go.th",
        ],
        "search_terms": ["มอก.", "มาตรฐาน", "ผลิตภัณฑ์"],
    },
    {
        "code": "NBTC",
        "name_th": "สำนักงานคณะกรรมการกิจการกระจายเสียง (กสทช.)",
        "name_en": "National Broadcasting and Telecommunications Commission",
        "urls": [
            "https://www.nbtc.go.th",
        ],
        "search_terms": ["อุปกรณ์สื่อสาร", "วิทยุ", "โทรคมนาคม"],
    },
    {
        "code": "DFT",
        "name_th": "กรมการค้าต่างประเทศ",
        "name_en": "Department of Foreign Trade",
        "urls": [
            "https://www.dft.go.th",
        ],
        "search_terms": ["สินค้าควบคุม", "ใบอนุญาต", "นำเข้า", "ส่งออก"],
    },
]

# NSW portal
NSW_URL = "https://www.thainsw.net"


def scrape_nsw() -> dict:
    """Try to access National Single Window portal."""
    result = {"url": NSW_URL, "status": "unknown", "data": []}

    try:
        resp = SESSION.get(NSW_URL, timeout=30)
        if resp.ok:
            filepath = os.path.join(OUTPUT_DIR, "nsw_main.html")
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(resp.text)
            result["status"] = "ok"

            soup = BeautifulSoup(resp.text, "lxml")
            # Look for links to permit/license databases
            for link in soup.find_all("a", href=True):
                text = link.get_text(strip=True)
                if any(term in text for term in ["ใบอนุญาต", "permit", "license", "พิกัด"]):
                    result["data"].append({
                        "text": text,
                        "url": link["href"],
                    })
        else:
            result["status"] = f"http_{resp.status_code}"
    except Exception as e:
        result["status"] = f"error: {e}"

    return result


def scrape_agency(agency: dict) -> dict:
    """Scrape an agency website for control/permit information."""
    result = {
        "code": agency["code"],
        "name_th": agency["name_th"],
        "pages": [],
        "pdfs": [],
    }

    for url in agency["urls"]:
        try:
            resp = SESSION.get(url, timeout=30)
            if not resp.ok:
                continue

            soup = BeautifulSoup(resp.text, "lxml")

            # Save HTML
            filepath = os.path.join(OUTPUT_DIR, f"{agency['code'].lower()}_main.html")
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(resp.text)

            # Find relevant subpages and PDFs
            for link in soup.find_all("a", href=True):
                href = link["href"]
                text = link.get_text(strip=True)

                if href.endswith(".pdf"):
                    full_url = href if href.startswith("http") else f"{url.rstrip('/')}/{href.lstrip('/')}"
                    result["pdfs"].append({"name": text, "url": full_url})

            result["pages"].append({"url": url, "status": "ok"})
            print(f"  [{agency['code']}] Scraped: {url}")

        except Exception as e:
            result["pages"].append({"url": url, "status": f"error: {e}"})
            print(f"  [{agency['code']}] Error: {url}: {e}")

    return result


def collect():
    """Main entry point: scrape NSW and agency websites."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print("[lpi] Scraping National Single Window...")
    nsw_result = scrape_nsw()

    print("[lpi] Scraping agency websites...")
    agency_results = []
    for agency in AGENCIES:
        print(f"\n[lpi] Agency: {agency['name_th']}")
        result = scrape_agency(agency)
        agency_results.append(result)

    # Save manifest
    manifest = {
        "nsw": nsw_result,
        "agencies": agency_results,
        "agency_codes": [a["code"] for a in AGENCIES],
    }
    with open(os.path.join(OUTPUT_DIR, "_manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    total_pdfs = sum(len(r.get("pdfs", [])) for r in agency_results)
    print(f"\n[lpi] Done. Agencies: {len(AGENCIES)}, PDFs found: {total_pdfs}")
    print(f"[lpi] Data saved to {OUTPUT_DIR}")
    return OUTPUT_DIR


if __name__ == "__main__":
    collect()
