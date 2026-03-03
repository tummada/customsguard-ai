"""
Collector: data.go.th — HS Code datasets (CSV/XLSX)

Downloads HS code datasets from Thailand Open Data portal.
Uses CKAN API to discover available datasets, then downloads CSV/XLSX files.

No AI needed — just direct download.
Provenance: source_url = https://data.go.th/en/dataset/hscode
"""

import os
import json
import requests
from tqdm import tqdm

import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from config import RAW_DIR

CKAN_API_BASE = "https://data.go.th/api/3/action"
DATASET_ID = "hscode"
OUTPUT_DIR = os.path.join(RAW_DIR, "hs-codes")


def discover_resources() -> list[dict]:
    """Use CKAN API to list all resources in the hscode dataset."""
    url = f"{CKAN_API_BASE}/package_show?id={DATASET_ID}"
    print(f"[opendata] Discovering datasets: {url}")

    resp = requests.get(url, timeout=30)
    resp.raise_for_status()
    data = resp.json()

    if not data.get("success"):
        raise RuntimeError(f"CKAN API failed: {data}")

    resources = data["result"]["resources"]
    print(f"[opendata] Found {len(resources)} resources")
    return resources


def download_resource(resource: dict, output_dir: str) -> str | None:
    """Download a single resource file (CSV, XLSX, etc.)."""
    url = resource.get("url", "")
    name = resource.get("name", "unknown")
    fmt = resource.get("format", "").upper()

    if fmt not in ("CSV", "XLSX", "XLS"):
        print(f"  Skipping {name} (format: {fmt})")
        return None

    # Sanitize filename
    safe_name = "".join(c if c.isalnum() or c in "._-" else "_" for c in name)
    ext = ".csv" if fmt == "CSV" else ".xlsx"
    if not safe_name.endswith(ext):
        safe_name += ext

    filepath = os.path.join(output_dir, safe_name)

    if os.path.exists(filepath):
        print(f"  Already downloaded: {safe_name}")
        return filepath

    print(f"  Downloading: {name} ({fmt}) -> {safe_name}")
    try:
        resp = requests.get(url, timeout=120, stream=True)
        resp.raise_for_status()

        total = int(resp.headers.get("content-length", 0))
        with open(filepath, "wb") as f:
            with tqdm(total=total, unit="B", unit_scale=True, desc=safe_name) as pbar:
                for chunk in resp.iter_content(chunk_size=8192):
                    f.write(chunk)
                    pbar.update(len(chunk))

        return filepath
    except Exception as e:
        print(f"  ERROR downloading {name}: {e}")
        return None


def collect():
    """Main entry point: discover and download all HS code datasets."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Save metadata
    resources = discover_resources()
    meta_path = os.path.join(OUTPUT_DIR, "_metadata.json")
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(resources, f, ensure_ascii=False, indent=2)

    downloaded = []
    for res in resources:
        path = download_resource(res, OUTPUT_DIR)
        if path:
            downloaded.append(path)

    print(f"\n[opendata] Downloaded {len(downloaded)} files to {OUTPUT_DIR}")
    return downloaded


if __name__ == "__main__":
    collect()
