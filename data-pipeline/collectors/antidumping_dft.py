"""
Collector: dft.go.th — Anti-Dumping / Countervailing Duties

กรมการค้าต่างประเทศ: มาตรการตอบโต้การทุ่มตลาด (AD/CVD)
สินค้าบางพิกัดจากบางประเทศ โดนบวกภาษีพิเศษเพิ่ม 30-50%
เช่น เหล็กจากจีน, อลูมิเนียมจากเกาหลี

Provenance: source_url = https://www.dft.go.th/...
"""

import os
import sys
import json
import requests
from bs4 import BeautifulSoup

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from config import RAW_DIR

OUTPUT_DIR = os.path.join(RAW_DIR, "antidumping")
BASE_URL = "https://www.dft.go.th"

SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": "Mozilla/5.0 (compatible; CustomsGuard-DataPipeline/1.0)",
    "Accept": "text/html, application/json, */*",
    "Accept-Language": "th,en;q=0.9",
})

# Known AD/CVD pages on dft.go.th
KNOWN_PAGES = [
    {
        "name": "มาตรการตอบโต้การทุ่มตลาด (AD)",
        "url": "https://www.dft.go.th/th-th/DFT-Service/การปกป้องและตอบโต้ทางการค้า/มาตรการตอบโต้การทุ่มตลาด",
        "type": "AD",
    },
    {
        "name": "มาตรการตอบโต้การอุดหนุน (CVD)",
        "url": "https://www.dft.go.th/th-th/DFT-Service/การปกป้องและตอบโต้ทางการค้า/มาตรการตอบโต้การอุดหนุน",
        "type": "CVD",
    },
    {
        "name": "มาตรการปกป้อง (Safeguard)",
        "url": "https://www.dft.go.th/th-th/DFT-Service/การปกป้องและตอบโต้ทางการค้า/มาตรการปกป้อง",
        "type": "SAFEGUARD",
    },
]


def scrape_page(url: str) -> dict:
    """Scrape a DFT page for AD/CVD information."""
    result = {"url": url, "html": "", "pdfs": [], "tables": []}

    try:
        resp = SESSION.get(url, timeout=30)
        if not resp.ok:
            return result

        result["html"] = resp.text
        soup = BeautifulSoup(resp.text, "lxml")

        # Find PDF links
        for link in soup.find_all("a", href=True):
            href = link["href"]
            if href.endswith(".pdf") or "/files/" in href:
                full_url = href if href.startswith("http") else f"{BASE_URL}{href}"
                result["pdfs"].append({
                    "name": link.get_text(strip=True),
                    "url": full_url,
                })

        # Extract tables
        for table in soup.find_all("table"):
            rows = []
            for tr in table.find_all("tr"):
                cells = [td.get_text(strip=True) for td in tr.find_all(["td", "th"])]
                if cells:
                    rows.append(cells)
            if rows:
                result["tables"].append(rows)

    except Exception as e:
        print(f"  Error scraping {url}: {e}")

    return result


def download_pdfs(pdfs: list[dict], output_dir: str):
    """Download PDF files from DFT."""
    pdf_dir = os.path.join(output_dir, "pdfs")
    os.makedirs(pdf_dir, exist_ok=True)

    for pdf_info in pdfs:
        filename = os.path.basename(pdf_info["url"]).split("?")[0]
        if not filename.endswith(".pdf"):
            filename += ".pdf"
        filepath = os.path.join(pdf_dir, filename)

        if os.path.exists(filepath):
            continue

        try:
            resp = SESSION.get(pdf_info["url"], timeout=120, stream=True)
            resp.raise_for_status()
            with open(filepath, "wb") as f:
                for chunk in resp.iter_content(8192):
                    f.write(chunk)
            print(f"  Downloaded: {filename}")
        except Exception as e:
            print(f"  Error downloading {filename}: {e}")


def collect():
    """Main entry point: scrape anti-dumping data from dft.go.th."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    all_data = []
    all_pdfs = []

    for page_info in KNOWN_PAGES:
        print(f"\n[ad] Scraping: {page_info['name']}")
        data = scrape_page(page_info["url"])
        data["type"] = page_info["type"]
        data["name"] = page_info["name"]

        all_data.append(data)
        all_pdfs.extend(data.get("pdfs", []))

        # Save raw HTML
        safe_name = page_info["type"].lower()
        with open(os.path.join(OUTPUT_DIR, f"{safe_name}_page.html"), "w", encoding="utf-8") as f:
            f.write(data["html"])

    # Download PDFs
    if all_pdfs:
        print(f"\n[ad] Downloading {len(all_pdfs)} PDFs...")
        download_pdfs(all_pdfs, OUTPUT_DIR)

    # Save manifest
    manifest = {
        "pages_scraped": len(all_data),
        "pdfs_found": len(all_pdfs),
        "sources": [p["url"] for p in KNOWN_PAGES],
    }
    with open(os.path.join(OUTPUT_DIR, "_manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    # Save tables data
    tables_data = []
    for data in all_data:
        for table in data.get("tables", []):
            tables_data.append({
                "type": data["type"],
                "source_url": data["url"],
                "rows": table,
            })
    with open(os.path.join(OUTPUT_DIR, "tables.json"), "w", encoding="utf-8") as f:
        json.dump(tables_data, f, ensure_ascii=False, indent=2)

    print(f"\n[ad] Data saved to {OUTPUT_DIR}")
    print(f"[ad] Tables found: {len(tables_data)}, PDFs: {len(all_pdfs)}")
    return OUTPUT_DIR


if __name__ == "__main__":
    collect()
