"""Debug FTA data structure"""
import json
from bs4 import BeautifulSoup

with open("data/raw/fta-data/ntr/acfta_rates.json") as f:
    data = json.load(f)

print(f"Total chapters: {len(data)}")

html = data[0]["data"]["html"]
soup = BeautifulSoup(html, "html.parser")

# Find all tables
tables = soup.find_all("table")
print(f"Tables: {len(tables)}")

for i, t in enumerate(tables):
    rows = t.find_all("tr")
    cls = t.get("class", [])
    print(f"\nTable {i}: {len(rows)} rows, class={cls}")
    for r in rows[:5]:
        cells = [td.get_text(strip=True)[:50] for td in r.find_all(["th", "td"])]
        print(f"  {cells}")

# Check for JavaScript-rendered content
scripts = soup.find_all("script")
for s in scripts:
    text = s.get_text()
    if "tariff" in text.lower() or "rate" in text.lower() or "duty" in text.lower():
        print(f"\nScript with tariff data ({len(text)} chars):")
        print(text[:1000])
