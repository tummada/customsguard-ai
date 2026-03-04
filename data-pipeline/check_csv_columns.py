"""Check CSV columns for FTA rate data"""
import csv, os, glob

hs_dir = os.path.expanduser("~/data-pipeline/data/raw/hs-codes")

# Check header of each unique CSV type
seen = set()
for f in sorted(glob.glob(os.path.join(hs_dir, "*.csv"))):
    # Get type prefix (e.g., ctm_06_04)
    base = os.path.basename(f)
    prefix = "_".join(base.split("_")[:3])
    if prefix in seen:
        continue
    seen.add(prefix)

    with open(f, "r", encoding="utf-8-sig", errors="replace") as fh:
        reader = csv.reader(fh)
        try:
            header = next(reader)
            first_row = next(reader, None)
            print(f"\n{base}")
            print(f"  Columns ({len(header)}): {header}")
            if first_row:
                print(f"  First row: {first_row[:8]}")

            # Check if any column name has rate/FTA/tariff related keywords
            for col in header:
                if any(kw in col.lower() for kw in ["rate", "fta", "tariff", "duty", "tax", "อัตรา", "ภาษี"]):
                    print(f"  >>> RATE COLUMN: {col}")
        except StopIteration:
            print(f"\n{base}: EMPTY")

# Also check NTR directory for any useful data
print("\n\n=== NTR raw data ===")
ntr_dir = os.path.expanduser("~/data-pipeline/data/raw/fta-data/ntr")
for f in os.listdir(ntr_dir):
    path = os.path.join(ntr_dir, f)
    size = os.path.getsize(path)
    print(f"  {f}: {size:,} bytes")

# Check DTN directory
print("\n=== DTN raw data ===")
dtn_dir = os.path.expanduser("~/data-pipeline/data/raw/fta-data/dtn")
for root, dirs, files in os.walk(dtn_dir):
    for f in files:
        path = os.path.join(root, f)
        size = os.path.getsize(path)
        rel = os.path.relpath(path, dtn_dir)
        print(f"  {rel}: {size:,} bytes")
