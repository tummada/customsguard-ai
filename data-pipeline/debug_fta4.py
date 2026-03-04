"""Deep search NTR HTML for rate data"""
import requests, re, json
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
    "Referer": "https://www.thailandntr.com/en/goods/tariff",
}

# Fetch search results page
url = "https://www.thailandntr.com/en/goods/tariff/search"
r = requests.get(url, params={"hs": "0306"}, headers=HEADERS, timeout=15)
html = r.text
soup = BeautifulSoup(html, "html.parser")

# 1. Check all tables
tables = soup.find_all("table")
print(f"Tables: {len(tables)}")
for i, t in enumerate(tables):
    rows = t.find_all("tr")
    print(f"  Table {i}: {len(rows)} rows")
    for r in rows[:3]:
        cells = [td.get_text(strip=True)[:40] for td in r.find_all(["th", "td"])]
        if cells:
            print(f"    {cells}")

# 2. Check script tags for embedded data
scripts = soup.find_all("script")
for s in scripts:
    txt = s.get_text()
    # Look for rate/tariff data in JS
    for pattern in [r'var\s+\w+\s*=\s*(\[.*?\]);', r'data\s*:\s*(\{[^}]{100,})', r'items\s*:\s*(\[.*?\])']:
        matches = re.findall(pattern, txt, re.S)
        for m in matches:
            if len(m) > 50:
                print(f"\nJS data found ({len(m)} chars):")
                print(m[:500])

# 3. Check for Vue.js :data or v-bind attributes
vue_els = soup.find_all(attrs={":data": True})
print(f"\nVue :data elements: {len(vue_els)}")
for el in vue_els:
    print(f"  {el.get(':data', '')[:200]}")

# 4. Look for any rate-related content
rate_text = re.findall(r'(?:rate|duty|tariff|%)\s*[:=]\s*[\d.]+', html, re.I)
print(f"\nRate mentions: {rate_text[:10]}")

# 5. Check total HTML size
print(f"\nTotal HTML size: {len(html)} chars")
print(f"Has 'MFN' in page: {'MFN' in html}")
print(f"Has 'preferential' in page: {'preferential' in html.lower()}")
print(f"Has '0306' in page: {'0306' in html}")
