"""
Collector: tax.dtn.go.th — FTA rate comparison (Department of Trade Negotiations)

React frontend → REST API behind it that can be reverse-engineered.
Provides MFN rates and FTA agreement comparison.

Provenance: source_url = https://tax.dtn.go.th/agreement/...
"""

import os
import json
import time
import requests
from tqdm import tqdm

import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from config import RAW_DIR

OUTPUT_DIR = os.path.join(RAW_DIR, "fta-data", "dtn")
BASE_URL = "https://tax.dtn.go.th"

SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": "Mozilla/5.0 (compatible; CustomsGuard-DataPipeline/1.0)",
    "Accept": "application/json, text/html, */*",
})


def discover_api_endpoints() -> dict:
    """
    Fetch the React app bundle to discover API endpoints.
    Save the main page and any discovered API patterns.
    """
    results = {"pages": [], "api_endpoints": []}

    # Fetch main pages to discover API structure
    pages_to_fetch = [
        "/agreement",
        "/mfn",
    ]

    for page in pages_to_fetch:
        try:
            resp = SESSION.get(f"{BASE_URL}{page}", timeout=30)
            if resp.ok:
                filepath = os.path.join(OUTPUT_DIR, f"page_{page.strip('/').replace('/', '_')}.html")
                with open(filepath, "w", encoding="utf-8") as f:
                    f.write(resp.text)
                results["pages"].append({"path": page, "saved_to": filepath})
                print(f"[dtn] Saved page: {page}")
        except Exception as e:
            print(f"[dtn] Error fetching {page}: {e}")

    # Try common REST API patterns
    api_patterns = [
        "/api/agreement",
        "/api/agreements",
        "/api/mfn",
        "/api/tariff",
        "/api/rates",
        "/api/v1/agreement",
        "/api/v1/tariff",
    ]

    for endpoint in api_patterns:
        try:
            resp = SESSION.get(f"{BASE_URL}{endpoint}", timeout=10)
            if resp.ok:
                try:
                    data = resp.json()
                    results["api_endpoints"].append({
                        "endpoint": endpoint,
                        "type": "json",
                        "sample": str(data)[:500],
                    })
                    # Save full response
                    filepath = os.path.join(OUTPUT_DIR, f"api_{endpoint.strip('/').replace('/', '_')}.json")
                    with open(filepath, "w", encoding="utf-8") as f:
                        json.dump(data, f, ensure_ascii=False, indent=2)
                    print(f"[dtn] Found API: {endpoint}")
                except json.JSONDecodeError:
                    pass
        except Exception:
            pass

    return results


def fetch_agreement_pdfs() -> list[dict]:
    """Try to download PDF tariff schedules."""
    pdfs = []

    # Try to find PDFs from the agreement page
    try:
        resp = SESSION.get(f"{BASE_URL}/agreement", timeout=30)
        if resp.ok:
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(resp.text, "lxml")
            for link in soup.find_all("a", href=True):
                href = link["href"]
                if href.endswith(".pdf") or "/public/agreement/" in href:
                    full_url = href if href.startswith("http") else f"{BASE_URL}{href}"
                    name = link.get_text(strip=True) or os.path.basename(href)
                    pdfs.append({
                        "name": name,
                        "url": full_url,
                        "source_url": f"{BASE_URL}/agreement",
                    })
    except Exception as e:
        print(f"[dtn] Error scanning for PDFs: {e}")

    # Download discovered PDFs
    pdf_dir = os.path.join(OUTPUT_DIR, "pdfs")
    os.makedirs(pdf_dir, exist_ok=True)

    for pdf_info in pdfs:
        filename = os.path.basename(pdf_info["url"])
        filepath = os.path.join(pdf_dir, filename)
        if os.path.exists(filepath):
            continue
        try:
            resp = SESSION.get(pdf_info["url"], timeout=120, stream=True)
            resp.raise_for_status()
            with open(filepath, "wb") as f:
                for chunk in resp.iter_content(8192):
                    f.write(chunk)
            print(f"[dtn] Downloaded PDF: {filename}")
        except Exception as e:
            print(f"[dtn] Error downloading {filename}: {e}")

    return pdfs


def collect():
    """Main entry point: discover APIs and download FTA comparison data."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print("[dtn] Discovering API endpoints...")
    api_info = discover_api_endpoints()

    print("[dtn] Looking for PDF tariff schedules...")
    pdfs = fetch_agreement_pdfs()

    # Save manifest
    manifest = {
        "api_info": api_info,
        "pdfs": pdfs,
    }
    manifest_path = os.path.join(OUTPUT_DIR, "_manifest.json")
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    print(f"\n[dtn] Data saved to {OUTPUT_DIR}")
    return OUTPUT_DIR


if __name__ == "__main__":
    collect()
