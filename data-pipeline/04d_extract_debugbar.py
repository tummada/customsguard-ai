"""Extract rate data from NTR PHP Debug Bar (exposed in HTML)"""
import os, sys, json, re, requests, time
sys.path.insert(0, os.path.dirname(__file__))
from config import get_db_conn, RAW_DIR
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
    "Referer": "https://www.thailandntr.com/en/goods/tariff",
}

def fetch_page(hs_code):
    """Fetch search results page."""
    r = requests.get(
        "https://www.thailandntr.com/en/goods/tariff/search",
        params={"hs": hs_code},
        headers=HEADERS,
        timeout=30,
    )
    return r.text


def extract_debugbar_data(html):
    """Extract PHP Debug Bar data which contains SQL queries and results."""
    # Debug bar data is in a script like: phpdebugbar.addDataSet({...}, "xxx")
    matches = re.findall(r'phpdebugbar\.addDataSet\((\{.*?\})\s*,\s*"', html, re.S)
    if matches:
        for m in matches:
            try:
                data = json.loads(m)
                return data
            except (ValueError, json.JSONDecodeError) as e:
                print(f"  Failed to parse debugbar JSON block: {e}")

    # Alternative: look for inline JSON data
    matches = re.findall(r'var\s+\w+\s*=\s*(\{[^;]{100,}\});', html, re.S)
    for m in matches:
        try:
            data = json.loads(m)
            return data
        except (ValueError, json.JSONDecodeError) as e:
            print(f"  Failed to parse inline JSON block: {e}")
    return None


def extract_rendered_data(html):
    """Extract data from the rendered HTML content."""
    soup = BeautifulSoup(html, "html.parser")

    # Find all text content and look for HS code patterns
    results = []

    # Method 1: Search in all div/span/td elements for rate patterns
    for el in soup.find_all(["td", "div", "span", "li", "p"]):
        text = el.get_text(strip=True)
        # Look for HS code + rate patterns
        if re.search(r'\d{4}\.\d{2}', text) and re.search(r'\d+\.?\d*\s*%', text):
            results.append(text[:300])

    # Method 2: Look for Vue.js v-for rendered rows
    for el in soup.find_all(attrs={"v-for": True}):
        results.append(f"Vue v-for: {el.get('v-for', '')} -> {el.get_text(strip=True)[:200]}")

    # Method 3: Search raw HTML for JSON-like rate data
    json_blocks = re.findall(r'\{[^{}]*"(?:rate|duty|tariff|hscode|hs_code)"[^{}]*\}', html, re.I)
    for block in json_blocks[:10]:
        results.append(f"JSON: {block[:200]}")

    return results


def main():
    # Test with one HS code
    print("Fetching HS 0306...", flush=True)
    html = fetch_page("0306")
    print(f"HTML size: {len(html)} chars")

    # Extract debug bar
    print("\n=== Debug Bar Data ===")
    dbdata = extract_debugbar_data(html)
    if dbdata:
        # Check for queries
        if "queries" in dbdata:
            queries = dbdata["queries"]
            if isinstance(queries, dict):
                stmts = queries.get("statements", [])
                print(f"SQL queries: {len(stmts)}")
                for q in stmts:
                    sql = q.get("sql", "")
                    print(f"  SQL: {sql[:200]}")
            elif isinstance(queries, list):
                print(f"SQL queries: {len(queries)}")
                for q in queries[:10]:
                    print(f"  {str(q)[:200]}")

        # Print all top-level keys
        print(f"\nDebug bar keys: {list(dbdata.keys())}")

        # Look for any data that contains rate info
        dbstr = json.dumps(dbdata, ensure_ascii=False)
        if "rate" in dbstr.lower() or "duty" in dbstr.lower():
            # Find rate mentions
            for m in re.finditer(r'.{0,50}(?:rate|duty).{0,50}', dbstr, re.I):
                print(f"  Rate mention: {m.group()[:150]}")

        # Save full debug data
        with open("/tmp/ntr_debugbar.json", "w") as f:
            json.dump(dbdata, f, ensure_ascii=False, indent=2)
        print("Saved full debug data to /tmp/ntr_debugbar.json")
    else:
        print("No debug bar data found")

    # Extract rendered data
    print("\n=== Rendered Data ===")
    rendered = extract_rendered_data(html)
    print(f"Found {len(rendered)} potential rate entries")
    for r in rendered[:20]:
        print(f"  {r}")

    # Also check: is the data in a script tag as JSON?
    print("\n=== Script Tag Data ===")
    soup = BeautifulSoup(html, "html.parser")
    for script in soup.find_all("script"):
        text = script.get_text()
        if len(text) > 200 and any(kw in text.lower() for kw in ["hscode", "tariff_no", "applied_rate", "mfn_rate"]):
            print(f"Script ({len(text)} chars):")
            # Try to extract JSON from it
            for m in re.finditer(r'(?:data|items|results)\s*[:=]\s*(\[[\s\S]*?\])', text):
                try:
                    arr = json.loads(m.group(1))
                    print(f"  Array with {len(arr)} items")
                    if arr:
                        print(f"  First: {json.dumps(arr[0], ensure_ascii=False)[:300]}")
                except (ValueError, json.JSONDecodeError):
                    print(f"  Raw: {m.group(1)[:200]}")


if __name__ == "__main__":
    main()
