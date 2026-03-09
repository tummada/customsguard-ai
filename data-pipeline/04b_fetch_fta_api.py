"""Fetch FTA rates directly from thailandntr.com API"""
import os, sys, json, time, requests
sys.path.insert(0, os.path.dirname(__file__))
from config import get_db_conn, RAW_DIR

NTR_BASE = "https://www.thailandntr.com/en/goods/tariff"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0",
    "Accept": "application/json, text/html, */*",
    "X-Requested-With": "XMLHttpRequest",
    "Referer": "https://www.thailandntr.com/en/goods/tariff",
}

FTA_AGREEMENTS = ["ATIGA", "ACFTA", "AKFTA", "AJCEP", "JTEPA", "TAFTA", "AANZFTA", "AIFTA", "RCEP", "TNZCEP"]

FTA_COUNTRIES = {
    "ATIGA": [("BRN", "Brunei"), ("KHM", "Cambodia"), ("IDN", "Indonesia"), ("LAO", "Laos"),
              ("MYS", "Malaysia"), ("MMR", "Myanmar"), ("PHL", "Philippines"), ("SGP", "Singapore"), ("VNM", "Vietnam")],
    "ACFTA": [("CHN", "China")],
    "AKFTA": [("KOR", "Korea")],
    "AJCEP": [("JPN", "Japan")],
    "JTEPA": [("JPN", "Japan")],
    "TAFTA": [("AUS", "Australia")],
    "AANZFTA": [("AUS", "Australia"), ("NZL", "New Zealand")],
    "AIFTA": [("IND", "India")],
    "RCEP": [("CHN", "China"), ("JPN", "Japan"), ("KOR", "Korea"), ("AUS", "Australia"), ("NZL", "New Zealand")],
    "TNZCEP": [("NZL", "New Zealand")],
}

FTA_FORMS = {
    "ATIGA": "Form D", "ACFTA": "Form E", "AKFTA": "Form AK",
    "AJCEP": "Form AJ", "JTEPA": "Form JTEPA", "TAFTA": "Form TAFTA",
    "AANZFTA": "Form AANZ", "AIFTA": "Form AI", "RCEP": "Form RCEP", "TNZCEP": "Form TNZCEP",
}


def test_api():
    """Test different API endpoints to find which works."""
    endpoints = [
        f"{NTR_BASE}/get-agreement",
        f"{NTR_BASE}/search",
        f"{NTR_BASE}",
    ]

    for url in endpoints:
        for method in ["GET", "POST"]:
            params = {"agreement": "ACFTA", "chapter": "01", "searchfile": "0301"}
            try:
                if method == "GET":
                    r = requests.get(url, params=params, headers=HEADERS, timeout=15)
                else:
                    r = requests.post(url, data=params, headers=HEADERS, timeout=15)

                content_type = r.headers.get("content-type", "")
                print(f"{method} {url}")
                print(f"  Status: {r.status_code}, Type: {content_type}")
                text = r.text[:300]
                if "json" in content_type:
                    print(f"  JSON: {text}")
                else:
                    # Check if it's actually JSON
                    try:
                        data = r.json()
                        print(f"  Hidden JSON: {json.dumps(data, ensure_ascii=False)[:300]}")
                    except (ValueError, json.JSONDecodeError) as e:
                        print(f"  HTML (not JSON: {e}): {text[:200]}")
                print()
            except Exception as e:
                print(f"{method} {url}: ERROR {e}\n")


def fetch_chapter_rates(agreement, chapter):
    """Try to fetch rates for a specific chapter."""
    params = {"agreement": agreement, "chapter": f"{chapter:02d}"}

    # Try different endpoints
    for url in [f"{NTR_BASE}/get-agreement", f"{NTR_BASE}/search"]:
        try:
            r = requests.get(url, params=params, headers=HEADERS, timeout=15)
            if r.status_code == 200:
                try:
                    return r.json()
                except (ValueError, json.JSONDecodeError) as e:
                    print(f"  GET {url} response not valid JSON: {e}")

            r = requests.post(url, data=params, headers=HEADERS, timeout=15)
            if r.status_code == 200:
                try:
                    return r.json()
                except (ValueError, json.JSONDecodeError) as e:
                    print(f"  POST {url} response not valid JSON: {e}")
        except Exception as e:
            print(f"  Error fetching {url} for {agreement} ch{chapter:02d}: {e}")
    return None


def main():
    print("Testing NTR API endpoints...\n")
    test_api()

    print("\n" + "="*50)
    print("Trying to fetch ACFTA Chapter 01 rates...")
    data = fetch_chapter_rates("ACFTA", 1)
    if data:
        print(f"Got data: {json.dumps(data, ensure_ascii=False)[:500]}")
    else:
        print("No data returned from any endpoint")
        print("\nNTR API might need different approach.")
        print("Checking if site is accessible...")
        try:
            r = requests.get("https://www.thailandntr.com", headers=HEADERS, timeout=10)
            print(f"  Site status: {r.status_code}")
        except Exception as e:
            print(f"  Site blocked: {e}")


if __name__ == "__main__":
    main()
