"""Embed all HS codes - single API with rate limiting"""
import os, sys, time, requests
sys.path.insert(0, os.path.dirname(__file__))
from config import get_db_conn, GEMINI_API_KEY

EMBED_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key={GEMINI_API_KEY}"
RATE_LIMIT = 20  # requests per second (free tier = 1500 RPM = 25/s)
MAX_RETRIES = 5


def embed_text(text):
    resp = requests.post(
        EMBED_URL,
        json={
            "content": {"parts": [{"text": text}]},
            "outputDimensionality": 768,
        },
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()["embedding"]["values"]


def build_text(code, desc_en, desc_th, category):
    parts = [code]
    if desc_en: parts.append(desc_en)
    if desc_th: parts.append(desc_th)
    if category: parts.append(category)
    return " ".join(parts)


def main():
    if not GEMINI_API_KEY or GEMINI_API_KEY == "ใส่ทีหลัง":
        print("ERROR: ต้องใส่ GEMINI_API_KEY ใน .env ก่อน!")
        sys.exit(1)

    conn = get_db_conn()
    cur = conn.cursor()

    cur.execute("SELECT COUNT(*) FROM cg_hs_codes WHERE embedded = TRUE")
    already = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM cg_hs_codes")
    total_all = cur.fetchone()[0]
    print(f"Progress: {already}/{total_all} already embedded")

    cur.execute("""
        SELECT code, description_en, description_th, category
        FROM cg_hs_codes
        WHERE embedded = FALSE OR embedding IS NULL
        ORDER BY code
    """)
    rows = cur.fetchall()
    remaining = len(rows)
    print(f"Remaining: {remaining}")

    if not rows:
        print("All done!")
        conn.close()
        return

    print("Starting (will retry on rate limit)...", flush=True)

    success = 0
    errors = 0
    start_time = time.time()
    interval = 1.0 / RATE_LIMIT

    for code, desc_en, desc_th, category in rows:
        text = build_text(code, desc_en, desc_th, category)
        req_start = time.time()

        retries = 0
        while retries < MAX_RETRIES:
            try:
                embedding = embed_text(text)
                vec_str = "[" + ",".join(str(v) for v in embedding) + "]"
                cur.execute(
                    "UPDATE cg_hs_codes SET embedding = %s::vector, embedded = TRUE, updated_at = NOW() WHERE code = %s",
                    (vec_str, code)
                )
                success += 1
                break
            except Exception as e:
                retries += 1
                if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                    wait = min(30 * retries, 120)
                    print(f"  Rate limited at {already + success}, waiting {wait}s...", flush=True)
                    conn.commit()
                    time.sleep(wait)
                elif retries >= MAX_RETRIES:
                    errors += 1
                    print(f"  FAILED {code}: {e}")
                    break
                else:
                    time.sleep(2)

        # Commit + progress every 100
        if success % 100 == 0 and success > 0:
            conn.commit()
            elapsed = time.time() - start_time
            rate = success / elapsed
            eta = (remaining - success) / rate
            print(
                f"  {already + success}/{total_all}  "
                f"(+{success}, {rate:.0f}/s, ETA {eta:.0f}s)",
                flush=True,
            )

        # Rate limit
        elapsed_req = time.time() - req_start
        if elapsed_req < interval:
            time.sleep(interval - elapsed_req)

    conn.commit()

    cur.execute("SELECT COUNT(*) FROM cg_hs_codes WHERE embedded = TRUE")
    final_total = cur.fetchone()[0]
    elapsed = time.time() - start_time
    print(f"\nDONE! +{success} embedded, {errors} errors, {elapsed:.0f}s")
    print(f"Total: {final_total}/{total_all}")
    conn.close()


if __name__ == "__main__":
    main()
