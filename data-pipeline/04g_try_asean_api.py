"""Try ASEAN Tariff Finder and other alternative FTA rate sources"""
import requests, json

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
}

# 1. ASEAN Tariff Finder
print("=== ASEAN Tariff Finder ===")
asean_urls = [
    "https://atr.asean.org/links/search/",
    "https://atr.asean.org/api/tariff",
    "https://atr.asean.org/api/v1/tariff",
    "http://atr.asean.org/links/search/",
    "https://tariff-finder.asean.org/",
    "https://tariff-finder.asean.org/api/tariff",
]
for url in asean_urls:
    try:
        r = requests.get(url, headers=HEADERS, timeout=10, allow_redirects=True)
        print(f"  {url}")
        print(f"    Status: {r.status_code}, Size: {len(r.text)}")
        if r.status_code == 200:
            print(f"    Content: {r.text[:200]}")
    except Exception as e:
        print(f"  {url}: {e}")
    print()

# 2. WTO Tariff Data
print("\n=== WTO Tariff Download ===")
wto_urls = [
    "https://tao.wto.org/api/v1/tariff/tha/0306",
    "https://api.wto.org/timeseries/v1/data?i=HS_M_0010&r=764&p=000&ps=2024",
]
for url in wto_urls:
    try:
        r = requests.get(url, headers=HEADERS, timeout=10)
        print(f"  {url}")
        print(f"    Status: {r.status_code}")
        if r.status_code == 200:
            print(f"    Content: {r.text[:300]}")
    except Exception as e:
        print(f"  {url}: {e}")

# 3. Thailand Customs Tariff e-service
print("\n=== Thailand Customs ===")
customs_urls = [
    "https://www.customs.go.th/tariff_rate.php",
    "https://igtf.customs.go.th/igtf/th/main",
    "https://igtf.customs.go.th/igtf/viewer/search.do",
]
for url in customs_urls:
    try:
        r = requests.get(url, headers=HEADERS, timeout=10, allow_redirects=True)
        print(f"  {url}")
        print(f"    Status: {r.status_code}, Size: {len(r.text)}")
    except Exception as e:
        print(f"  {url}: {e}")

# 4. MacMap (ITC)
print("\n=== MacMap (ITC) ===")
try:
    r = requests.get("https://www.macmap.org/api/v2/tariff-lines?reporter=764&partner=156&product=0306&year=2024",
                      headers=HEADERS, timeout=10)
    print(f"  Status: {r.status_code}")
    if r.status_code == 200:
        print(f"  Content: {r.text[:300]}")
except Exception as e:
    print(f"  Error: {e}")
