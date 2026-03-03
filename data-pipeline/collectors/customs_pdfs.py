"""
Collector: customs.go.th — PDF documents (rulings, laws, regulations)

Downloads PDF files from the Customs Department website.
These are Oracle Reports PDFs with complex tables — will need Gemini Vision later.

Provenance: source_url = https://customs.go.th/data_files/{hash}.pdf
"""

import os
import json
import requests
from tqdm import tqdm

import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from config import RAW_DIR

OUTPUT_DIR = os.path.join(RAW_DIR, "customs-pdfs")

# Known important PDF files from customs.go.th
# Add more as discovered during exploration
KNOWN_PDFS = [
    {
        "name": "คำวินิจฉัยรวม (Consolidated Rulings)",
        "url": "https://customs.go.th/data_files/37f9ba48c10f400c08baa7c611999bec.pdf",
        "filename": "consolidated_rulings.pdf",
    },
    {
        "name": "พ.ร.ก.พิกัดอัตราศุลกากร (Customs Tariff Act)",
        "url": "https://customs.go.th/data_files/ac2f4e7826e2254f0ee6087d224fa8e4.pdf",
        "filename": "customs_tariff_act.pdf",
    },
]


def download_pdf(url: str, filename: str, output_dir: str) -> str | None:
    """Download a single PDF file."""
    filepath = os.path.join(output_dir, filename)

    if os.path.exists(filepath):
        size = os.path.getsize(filepath)
        print(f"  Already downloaded: {filename} ({size / 1024 / 1024:.1f} MB)")
        return filepath

    print(f"  Downloading: {filename}")
    try:
        resp = requests.get(url, timeout=300, stream=True, headers={
            "User-Agent": "Mozilla/5.0 (compatible; CustomsGuard-DataPipeline/1.0)"
        })
        resp.raise_for_status()

        total = int(resp.headers.get("content-length", 0))
        with open(filepath, "wb") as f:
            with tqdm(total=total, unit="B", unit_scale=True, desc=filename) as pbar:
                for chunk in resp.iter_content(chunk_size=8192):
                    f.write(chunk)
                    pbar.update(len(chunk))

        return filepath
    except Exception as e:
        print(f"  ERROR downloading {filename}: {e}")
        if os.path.exists(filepath):
            os.remove(filepath)
        return None


def discover_more_pdfs() -> list[dict]:
    """
    Attempt to discover additional PDF links from customs.go.th download center.
    This may need manual curation since the site uses JSP.
    """
    # customs.go.th uses JSP-based pages — hard to scrape automatically
    # Start with known PDFs, add more manually as discovered
    extra_pdfs = []

    # Try the download center page
    try:
        resp = requests.get(
            "https://customs.go.th/list_strc_download.php?ini_content=individual_download_160728_01&lang=th&left_menu=menu_individual_download_160498_01",
            timeout=30,
            headers={"User-Agent": "Mozilla/5.0 (compatible; CustomsGuard-DataPipeline/1.0)"},
        )
        if resp.ok:
            # Look for PDF links in the page
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(resp.text, "lxml")
            for link in soup.find_all("a", href=True):
                href = link["href"]
                if "data_files" in href and href.endswith(".pdf"):
                    full_url = href if href.startswith("http") else f"https://customs.go.th{href}"
                    name = link.get_text(strip=True) or os.path.basename(href)
                    filename = os.path.basename(href)
                    extra_pdfs.append({
                        "name": name,
                        "url": full_url,
                        "filename": filename,
                    })
            print(f"[customs] Discovered {len(extra_pdfs)} additional PDFs from download center")
    except Exception as e:
        print(f"[customs] Could not scrape download center: {e}")

    return extra_pdfs


def collect():
    """Main entry point: download all known customs PDFs."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    all_pdfs = KNOWN_PDFS.copy()

    # Try to discover more
    extra = discover_more_pdfs()
    # Deduplicate by URL
    known_urls = {p["url"] for p in all_pdfs}
    for pdf in extra:
        if pdf["url"] not in known_urls:
            all_pdfs.append(pdf)
            known_urls.add(pdf["url"])

    # Save manifest
    manifest_path = os.path.join(OUTPUT_DIR, "_manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(all_pdfs, f, ensure_ascii=False, indent=2)

    downloaded = []
    for pdf_info in all_pdfs:
        path = download_pdf(pdf_info["url"], pdf_info["filename"], OUTPUT_DIR)
        if path:
            downloaded.append({**pdf_info, "local_path": path})

    print(f"\n[customs] Downloaded {len(downloaded)} PDFs to {OUTPUT_DIR}")
    return downloaded


if __name__ == "__main__":
    collect()
