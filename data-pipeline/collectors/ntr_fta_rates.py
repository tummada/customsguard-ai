"""
Collector: thailandntr.com — FTA tariff rates

Scrapes FTA rates from Thailand's National Trade Repository.
Has AJAX endpoints for tariff data.

FTA coverage: ATIGA, ACFTA, AKFTA, AJCEP, JTEPA, TAFTA, AANZFTA, AIFTA, RCEP, TNZCEP
Provenance: source_url = https://www.thailandntr.com/en/goods/tariff/...
"""

import os
import json
import time
import requests
from tqdm import tqdm

import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from config import RAW_DIR

OUTPUT_DIR = os.path.join(RAW_DIR, "fta-data", "ntr")
BASE_URL = "https://www.thailandntr.com"

# Known FTA agreements available on the site
FTA_AGREEMENTS = [
    {"name": "ATIGA", "label": "ASEAN Trade in Goods Agreement"},
    {"name": "ACFTA", "label": "ASEAN-China FTA"},
    {"name": "AKFTA", "label": "ASEAN-Korea FTA"},
    {"name": "AJCEP", "label": "ASEAN-Japan Comprehensive Economic Partnership"},
    {"name": "JTEPA", "label": "Japan-Thailand Economic Partnership Agreement"},
    {"name": "TAFTA", "label": "Thailand-Australia FTA"},
    {"name": "AANZFTA", "label": "ASEAN-Australia-New Zealand FTA"},
    {"name": "AIFTA", "label": "ASEAN-India FTA"},
    {"name": "RCEP", "label": "Regional Comprehensive Economic Partnership"},
    {"name": "TNZCEP", "label": "Thailand-New Zealand Closer Economic Partnership"},
]

SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": "Mozilla/5.0 (compatible; CustomsGuard-DataPipeline/1.0)",
    "Accept": "application/json, text/html, */*",
})


def fetch_agreements_list() -> list[dict]:
    """Try to discover FTA agreements via AJAX endpoint."""
    try:
        resp = SESSION.get(
            f"{BASE_URL}/en/goods/tariff/get-agreement",
            timeout=30,
        )
        if resp.ok:
            data = resp.json()
            print(f"[ntr] Found {len(data)} agreements via API")
            return data
    except Exception as e:
        print(f"[ntr] Could not fetch agreements list: {e}")
    return []


def fetch_tariff_page(hs_chapter: str, agreement: str, page: int = 1) -> dict | None:
    """Fetch tariff rates for a specific HS chapter and FTA agreement."""
    try:
        resp = SESSION.get(
            f"{BASE_URL}/en/goods/tariff",
            params={
                "agreement": agreement,
                "chapter": hs_chapter,
                "page": page,
            },
            timeout=30,
        )
        if resp.ok:
            # Try JSON first
            try:
                return resp.json()
            except json.JSONDecodeError:
                # HTML response — save raw
                return {"html": resp.text, "chapter": hs_chapter, "agreement": agreement}
    except Exception as e:
        print(f"  Error fetching {agreement}/{hs_chapter}: {e}")
    return None


def scrape_fta_rates(agreement_name: str) -> list[dict]:
    """Scrape all tariff rates for a single FTA agreement."""
    all_data = []

    # HS chapters 01-97
    chapters = [f"{i:02d}" for i in range(1, 98)]

    for chapter in tqdm(chapters, desc=f"  {agreement_name}"):
        page = 1
        while True:
            data = fetch_tariff_page(chapter, agreement_name, page)
            if not data:
                break

            all_data.append({
                "chapter": chapter,
                "page": page,
                "data": data,
                "source_url": f"{BASE_URL}/en/goods/tariff?agreement={agreement_name}&chapter={chapter}&page={page}",
            })

            # Check if there are more pages
            if isinstance(data, dict) and data.get("has_next"):
                page += 1
                time.sleep(0.5)  # Be polite
            else:
                break

        time.sleep(0.3)  # Polite delay between chapters

    return all_data


def collect():
    """Main entry point: scrape all FTA rates from thailandntr.com."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Try to discover agreements via API
    api_agreements = fetch_agreements_list()
    if api_agreements:
        meta_path = os.path.join(OUTPUT_DIR, "_api_agreements.json")
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(api_agreements, f, ensure_ascii=False, indent=2)

    # Also save the main tariff page HTML for manual analysis
    try:
        resp = SESSION.get(f"{BASE_URL}/en/goods/tariff", timeout=30)
        if resp.ok:
            html_path = os.path.join(OUTPUT_DIR, "_tariff_page.html")
            with open(html_path, "w", encoding="utf-8") as f:
                f.write(resp.text)
            print("[ntr] Saved main tariff page HTML for analysis")
    except Exception:
        pass

    # Scrape each FTA
    for fta in FTA_AGREEMENTS:
        fta_name = fta["name"]
        output_file = os.path.join(OUTPUT_DIR, f"{fta_name.lower()}_rates.json")

        if os.path.exists(output_file):
            print(f"[ntr] Already collected: {fta_name}")
            continue

        print(f"\n[ntr] Scraping {fta_name} ({fta['label']})...")
        data = scrape_fta_rates(fta_name)

        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        print(f"[ntr] Saved {len(data)} chapter-pages for {fta_name}")
        time.sleep(2)  # Polite delay between FTAs

    print(f"\n[ntr] All FTA data saved to {OUTPUT_DIR}")
    return OUTPUT_DIR


if __name__ == "__main__":
    collect()
