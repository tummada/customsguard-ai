"""Test NTR search API with HS code"""
import requests, json

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
    "Accept": "application/json, text/html, */*",
    "X-Requested-With": "XMLHttpRequest",
    "Referer": "https://www.thailandntr.com/en/goods/tariff",
}

BASE = "https://www.thailandntr.com/en/goods/tariff"

# Try search with HS code
for hs in ["0301", "03", "0306"]:
    r = requests.get(f"{BASE}/search", params={"hs": hs}, headers=HEADERS, timeout=15)
    print(f"hs={hs}: status={r.status_code}")
    try:
        data = r.json()
        if isinstance(data, list):
            print(f"  Got {len(data)} results")
            if data:
                print(f"  First: {json.dumps(data[0], ensure_ascii=False)[:300]}")
        elif isinstance(data, dict):
            print(f"  Keys: {list(data.keys())}")
            # Check for nested data
            for k, v in data.items():
                if isinstance(v, list):
                    print(f"  {k}: {len(v)} items")
                    if v:
                        print(f"    First: {json.dumps(v[0], ensure_ascii=False)[:200]}")
                elif isinstance(v, dict):
                    print(f"  {k}: {list(v.keys())}")
                else:
                    print(f"  {k}: {str(v)[:100]}")
    except (ValueError, json.JSONDecodeError):
        print(f"  Not JSON: {r.text[:200]}")
    print()

# Try with agreement filter
r = requests.get(f"{BASE}/search", params={"hs": "0301", "agreement": "ACFTA"}, headers=HEADERS, timeout=15)
print(f"hs=0301+ACFTA: status={r.status_code}")
try:
    data = r.json()
    print(f"  {json.dumps(data, ensure_ascii=False)[:500]}")
except (ValueError, json.JSONDecodeError):
    print(f"  {r.text[:300]}")
