"""Find API endpoints in NTR tariff page"""
import re

with open("data/raw/fta-data/ntr/_tariff_page.html") as f:
    html = f.read()

# Search for API/ajax URLs
patterns = [
    r'url\s*[:=]\s*["\']([^"\']+)',
    r'href\s*=\s*["\']([^"\']*(?:api|tariff|rate|search)[^"\']*)',
    r'action\s*=\s*["\']([^"\']+)',
    r'\.get\(["\']([^"\']+)',
    r'\.post\(["\']([^"\']+)',
    r'fetch\(["\']([^"\']+)',
]

found = set()
for p in patterns:
    for m in re.findall(p, html, re.I):
        if len(m) > 5 and ("/" in m or "http" in m):
            found.add(m)

print("Potential API endpoints:")
for u in sorted(found):
    print(f"  {u}")

# Also search for searchFta function
match = re.search(r'function searchFta.*?}', html, re.S)
if match:
    print("\nsearchFta function:")
    print(match.group()[:500])

# Search for any data loading function
for m in re.finditer(r'(function\s+\w*(?:search|load|fetch|get)\w*\s*\([^)]*\)\s*\{[^}]{0,500})', html, re.I):
    print(f"\nFunction: {m.group()[:300]}")
