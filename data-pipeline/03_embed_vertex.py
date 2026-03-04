"""Embed HS codes via Vertex AI (billed to GCP credit, no daily limit)"""
import os, sys, time, json
sys.path.insert(0, os.path.dirname(__file__))
from config import get_db_conn

import google.auth
import google.auth.transport.requests
import requests

PROJECT = "customs-guard-ai"
REGION = "us-central1"
MODEL = "gemini-embedding-001"
ENDPOINT = f"https://{REGION}-aiplatform.googleapis.com/v1beta1/projects/{PROJECT}/locations/{REGION}/publishers/google/models/{MODEL}:predict"
BATCH_SIZE = 250  # Vertex AI supports up to 250 per request


def get_access_token():
    """Get access token from VM's service account."""
    creds, _ = google.auth.default()
    creds.refresh(google.auth.transport.requests.Request())
    return creds.token


def batch_embed(texts, token):
    """Embed up to 250 texts in one Vertex AI call."""
    resp = requests.post(
        ENDPOINT,
        headers={"Authorization": f"Bearer {token}"},
        json={
            "instances": [{"content": t, "task_type": "RETRIEVAL_DOCUMENT"} for t in texts],
            "parameters": {"outputDimensionality": 768},
        },
        timeout=120,
    )
    resp.raise_for_status()
    return [p["embeddings"]["values"] for p in resp.json()["predictions"]]


def build_text(code, desc_en, desc_th, category):
    parts = [code]
    if desc_en: parts.append(desc_en)
    if desc_th: parts.append(desc_th)
    if category: parts.append(category)
    return " ".join(parts)


def main():
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

    # Get token
    print("Getting Vertex AI access token...", flush=True)
    token = get_access_token()
    print("  OK!")

    # Test
    print("Testing Vertex AI embedding...", flush=True)
    test = batch_embed(["test"], token)
    print(f"  OK! {len(test[0])} dimensions")

    success = 0
    errors = 0
    start_time = time.time()

    for batch_start in range(0, remaining, BATCH_SIZE):
        batch = rows[batch_start:batch_start + BATCH_SIZE]
        codes = [r[0] for r in batch]
        texts = [build_text(*r) for r in batch]

        try:
            # Refresh token every 1000 codes (tokens expire in ~1hr)
            if success > 0 and success % 1000 == 0:
                token = get_access_token()

            embeddings = batch_embed(texts, token)

            for code, embedding in zip(codes, embeddings):
                vec_str = "[" + ",".join(str(v) for v in embedding) + "]"
                cur.execute(
                    "UPDATE cg_hs_codes SET embedding = %s::vector, embedded = TRUE, updated_at = NOW() WHERE code = %s",
                    (vec_str, code)
                )

            conn.commit()
            success += len(batch)

            elapsed = time.time() - start_time
            rate = success / elapsed
            eta = (remaining - success) / rate if rate > 0 else 0
            print(
                f"  {already + success}/{total_all}  "
                f"(+{success}, {rate:.0f}/s, ETA {eta:.0f}s)",
                flush=True,
            )

        except Exception as e:
            errors += len(batch)
            print(f"  ERROR at {codes[0]}: {e}")
            # Try refreshing token in case it expired
            try:
                token = get_access_token()
            except:
                pass
            if errors > 1000:
                print("Too many errors, stopping.")
                break

    conn.commit()

    cur.execute("SELECT COUNT(*) FROM cg_hs_codes WHERE embedded = TRUE")
    final_total = cur.fetchone()[0]
    elapsed = time.time() - start_time
    print(f"\nDONE! +{success} embedded, {errors} errors, {elapsed:.0f}s")
    print(f"Total: {final_total}/{total_all}")
    conn.close()


if __name__ == "__main__":
    main()
