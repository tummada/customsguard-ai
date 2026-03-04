"""Extract FTA rate data from NTR PHP Debug Bar"""
import os, sys, json, re, requests
sys.path.insert(0, os.path.dirname(__file__))

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
    "Referer": "https://www.thailandntr.com/en/goods/tariff",
}


def fetch_and_extract(hs_code):
    """Fetch NTR search page and extract debug bar data."""
    r = requests.get(
        "https://www.thailandntr.com/en/goods/tariff/search",
        params={"hs": hs_code},
        headers=HEADERS,
        timeout=30,
    )
    html = r.text

    # Find addDataSet JSON
    m = re.search(r'phpdebugbar\.addDataSet\((\{.*?\})\s*,\s*"', html, re.S)
    if not m:
        # Try greedy match
        m = re.search(r'phpdebugbar\.addDataSet\((\{[\s\S]+\})\s*,\s*"[^"]*"\)', html)
    if not m:
        return None

    try:
        data = json.loads(m.group(1))
        return data
    except json.JSONDecodeError:
        # Try to fix truncated JSON
        raw = m.group(1)
        # Find the view data section
        return {"_raw_length": len(raw), "_raw_snippet": raw[:1000]}


def extract_view_data(debug_data):
    """Extract view variables (ftas, results, mfn) from debug bar."""
    views = debug_data.get("views", {})
    if isinstance(views, dict):
        templates = views.get("templates", views.get("data", []))
        if isinstance(templates, list):
            for tmpl in templates:
                params = tmpl.get("params", tmpl.get("data", {}))
                if isinstance(params, dict):
                    return params
                if isinstance(params, list):
                    # View params as list
                    print(f"  Template: {tmpl.get('name', '?')}")
                    print(f"  Params (list): {params}")
    return None


def extract_queries(debug_data):
    """Extract SQL queries and their results."""
    queries = debug_data.get("queries", {})
    if isinstance(queries, dict):
        stmts = queries.get("statements", [])
        return stmts
    return []


def main():
    # Test with HS 0306
    print("Fetching HS 0306...", flush=True)
    data = fetch_and_extract("0306")

    if not data:
        print("Failed to extract debug bar data")
        return

    if "_raw_length" in data:
        print(f"Got raw data ({data['_raw_length']} chars) but couldn't parse JSON")
        print(f"Snippet: {data['_raw_snippet']}")
        return

    # Save full debug data
    with open("/tmp/ntr_full_debug.json", "w") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Debug bar keys: {list(data.keys())}")

    # Extract SQL queries
    print("\n=== SQL Queries ===")
    stmts = extract_queries(data)
    print(f"Total queries: {len(stmts)}")
    for s in stmts:
        sql = s.get("sql", "")
        if "hscode" in sql.lower() or "fta" in sql.lower() or "tariff" in sql.lower():
            print(f"  {sql[:200]}")

    # Extract view data
    print("\n=== View Data ===")
    views = data.get("views", {})
    print(f"Views type: {type(views).__name__}")
    if isinstance(views, dict):
        templates = views.get("templates", [])
        if isinstance(templates, list):
            for tmpl in templates:
                name = tmpl.get("name", "?")
                params = tmpl.get("params", [])
                if isinstance(params, list) and any(p in params for p in ["results", "mfn", "ftas"]):
                    print(f"\n  Template: {name}")
                    print(f"  Params: {params}")

    # Search entire debug data for rate values
    print("\n=== Rate Data Search ===")
    data_str = json.dumps(data, ensure_ascii=False)

    # Look for numeric rate patterns near hscode
    for m in re.finditer(r'"(?:applied_rate|mfn_rate|preferential_rate|rate)":\s*"?(\d+\.?\d*)', data_str):
        start = max(0, m.start() - 100)
        end = min(len(data_str), m.end() + 50)
        print(f"  Rate found: {data_str[start:end]}")

    # Look for HS code data objects
    for m in re.finditer(r'\{[^{}]*"hscode"[^{}]*\}', data_str):
        obj_str = m.group()
        if len(obj_str) < 500:
            print(f"  HS object: {obj_str[:300]}")

    print(f"\nFull debug data saved to /tmp/ntr_full_debug.json")
    print(f"Total size: {len(data_str)} chars")

    # Check if 'results' or 'mfn' appear as actual data
    for key in ["results", "mfn", "ftas", "tariff", "agreements"]:
        if key in data_str:
            count = data_str.count(f'"{key}"')
            print(f'  "{key}" appears {count} times')


if __name__ == "__main__":
    main()
