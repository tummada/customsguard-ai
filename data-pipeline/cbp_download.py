import json, requests, os
OUTPUT_DIR = os.path.expanduser("~/data-pipeline/data/raw/cbp-cross")
os.makedirs(OUTPUT_DIR, exist_ok=True)
CHAPTERS = ["01","02","03","04","08","09","10","11","15","16","17","18","19","27","28","29","32","33","34","38","39","40","44","48","54","55","61","62","63","70","71","72","73","76","84","85","87","90","94","95","96"]
total = 0
for ch in CHAPTERS:
    print(f"Chapter {ch}...", end=" ", flush=True)
    try:
        r = requests.get("https://rulings.cbp.gov/api/search", params={"term": ch, "page": 1, "per_page": 100}, timeout=30)
        data = r.json()
        rulings = data.get("rulings", [])
        outfile = os.path.join(OUTPUT_DIR, f"chapter_{ch}.json")
        with open(outfile, "w") as f:
            json.dump(rulings, f, ensure_ascii=False, indent=2)
        total += len(rulings)
        print(f"{len(rulings)} rulings")
    except Exception as e:
        print(f"ERROR: {e}")
print(f"\nTotal: {total} rulings saved to {OUTPUT_DIR}")
