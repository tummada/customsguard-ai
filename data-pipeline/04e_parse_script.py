"""Parse the large script tag from NTR for rate data"""
import os, sys, json, re, requests
sys.path.insert(0, os.path.dirname(__file__))
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
    "Referer": "https://www.thailandntr.com/en/goods/tariff",
}

html = requests.get(
    "https://www.thailandntr.com/en/goods/tariff/search",
    params={"hs": "0306"},
    headers=HEADERS,
    timeout=30,
).text

soup = BeautifulSoup(html, "html.parser")

for i, script in enumerate(soup.find_all("script")):
    text = script.get_text()
    if len(text) > 10000:
        print(f"=== Script {i}: {len(text)} chars ===")
        # Save to file for analysis
        with open(f"/tmp/ntr_script_{i}.txt", "w") as f:
            f.write(text)
        print(f"Saved to /tmp/ntr_script_{i}.txt")

        # Show first 500 chars
        print(f"Start: {text[:500]}")
        print(f"...")

        # Search for data patterns
        # Look for phpdebugbar
        if "phpdebugbar" in text:
            print("Contains phpdebugbar!")
            # Find addDataSet call
            m = re.search(r'addDataSet\((.*)', text[:50000], re.S)
            if m:
                print(f"addDataSet found at char {m.start()}")
                snippet = m.group(1)[:500]
                print(f"  {snippet}")

        # Look for hscode/tariff data
        for kw in ["hscode", "tariff_no", "mfn", "applied_rate", "preferential"]:
            positions = [m.start() for m in re.finditer(kw, text, re.I)]
            if positions:
                print(f"\n'{kw}' found {len(positions)} times")
                # Show context around first occurrence
                pos = positions[0]
                print(f"  Context: ...{text[max(0,pos-50):pos+100]}...")

        # Try to find JSON arrays
        for m in re.finditer(r'"hscode"', text):
            start = max(0, m.start() - 200)
            end = min(len(text), m.end() + 200)
            print(f"\nhscode context: {text[start:end]}")
            break
