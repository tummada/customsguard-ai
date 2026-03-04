"""Find where rate data appears in the HTML"""
import requests, re

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
    "Referer": "https://www.thailandntr.com/en/goods/tariff",
}

r = requests.get("https://www.thailandntr.com/en/goods/tariff/search",
                  params={"hs": "0306"}, headers=HEADERS, timeout=15)
html = r.text

# Find all occurrences of "0306" with context
for m in re.finditer(r'.{0,100}0306.{0,100}', html):
    line = m.group().strip()
    if line and "0306" in line and "google" not in line.lower():
        print(line[:200])
        print("---")

# Also look for "MFN" with context
print("\n=== MFN mentions ===")
for m in re.finditer(r'.{0,80}MFN.{0,80}', html):
    line = m.group().strip()
    if "MFN" in line and "google" not in line.lower():
        print(line[:200])
        print("---")
