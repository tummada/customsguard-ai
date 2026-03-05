#!/usr/bin/env python3
"""
Script 15: RAG Benchmark using Synthetic Q&A pairs

Evaluates RAG quality by:
1. Hit Rate: Does the correct source chunk appear in top-K results?
2. Faithfulness: Does the LLM answer based on retrieved context (not hallucinate)?

Uses LLM-as-judge (Gemini Flash) to score faithfulness.

Requirements:
  - Dev DB running with restored data (14_restore_local.py)
  - GEMINI_API_KEY set in environment
  - cg_document_chunks populated with SYNTHETIC_QA entries
"""

import os
import sys
import json
import time

sys.path.insert(0, os.path.dirname(__file__))
from config import get_db_conn, GEMINI_API_KEY, EMBEDDING_DIMS

import requests

# Gemini embedding (free tier)
EMBED_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    f"gemini-embedding-001:embedContent?key={GEMINI_API_KEY}"
)

# Gemini chat for faithfulness scoring
CHAT_URL = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    f"gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"
)

TOP_K = 5
SAMPLE_SIZE = 30  # max Q&A pairs to benchmark (0 = all)
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "data", "rag_benchmark_results.json")


def embed_query(text):
    """Embed a single query using Gemini free tier."""
    resp = requests.post(EMBED_URL, json={
        "content": {"parts": [{"text": text}]},
        "taskType": "RETRIEVAL_QUERY",
        "outputDimensionality": EMBEDDING_DIMS,
    }, timeout=30)
    resp.raise_for_status()
    return resp.json()["embedding"]["values"]


def vector_to_string(vec):
    return "[" + ",".join(str(v) for v in vec) + "]"


def retrieve_chunks(conn, query_embedding_str, limit=TOP_K):
    """Retrieve top-K chunks via pgvector cosine similarity."""
    with conn.cursor() as cur:
        cur.execute("""
            SELECT id::text, source_type, source_id, chunk_index, chunk_text,
                   content_summary, metadata::text,
                   1 - (embedding <=> %s::vector) AS similarity
            FROM cg_document_chunks
            ORDER BY embedding <=> %s::vector
            LIMIT %s
        """, (query_embedding_str, query_embedding_str, limit))
        return cur.fetchall()


def score_faithfulness(question, answer, context):
    """Use LLM-as-judge to score faithfulness (0-1)."""
    prompt = f"""คุณเป็นผู้ตรวจสอบคุณภาพ AI

ให้ context ด้านล่าง ประเมินว่าคำตอบอ้างอิงจาก context จริงหรือไม่

Context:
{context[:3000]}

Question: {question}
Answer: {answer}

ให้คะแนน 0-1:
- 1.0 = คำตอบอ้างอิงจาก context ทั้งหมด ถูกต้อง
- 0.5 = คำตอบบางส่วนมาจาก context แต่มีส่วนที่เดาเอง
- 0.0 = คำตอบไม่เกี่ยวกับ context เลย หรือมโนทั้งหมด

ตอบเป็น JSON เท่านั้น: {{"score": 0.0, "reason": "..."}}"""

    try:
        for attempt in range(3):
            resp = requests.post(CHAT_URL, json={
                "contents": [{"role": "user", "parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0.1, "maxOutputTokens": 256},
            }, timeout=30)
            if resp.status_code == 429:
                wait = 10 * (attempt + 1)
                time.sleep(wait)
                continue
            resp.raise_for_status()
            break
        else:
            return -1, "rate limited after 3 retries"

        text = resp.json()["candidates"][0]["content"]["parts"][0]["text"]
        # Extract JSON from response
        text = text.strip()
        if text.startswith("```"):
            text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        result = json.loads(text)
        return float(result.get("score", 0)), result.get("reason", "")
    except Exception as e:
        # Mask API key in error messages
        err = str(e)
        if "key=" in err:
            err = err.split("key=")[0] + "key=***"
        return -1, f"scoring error: {err}"


def get_qa_pairs(conn, limit=0):
    """Get synthetic Q&A pairs from cg_document_chunks."""
    query = """
        SELECT id::text, source_id, chunk_text, metadata::text
        FROM cg_document_chunks
        WHERE source_type = 'SYNTHETIC_QA'
        ORDER BY created_at
    """
    if limit > 0:
        query += f" LIMIT {limit}"

    with conn.cursor() as cur:
        cur.execute(query)
        rows = cur.fetchall()

    pairs = []
    for row_id, source_id, chunk_text, metadata_str in rows:
        try:
            meta = json.loads(metadata_str) if metadata_str else {}
        except json.JSONDecodeError:
            meta = {}

        question = meta.get("question", "")
        answer = meta.get("answer", "")
        if question and answer:
            pairs.append({
                "id": row_id,
                "source_id": source_id,
                "question": question,
                "answer": answer,
                "chunk_text": chunk_text,
                "regulation_title": meta.get("regulation_title", ""),
            })
    return pairs


def main():
    if not GEMINI_API_KEY:
        print("ERROR: GEMINI_API_KEY not set")
        sys.exit(1)

    conn = get_db_conn()

    # Get Q&A pairs
    qa_pairs = get_qa_pairs(conn, limit=SAMPLE_SIZE)
    if not qa_pairs:
        print("ERROR: No SYNTHETIC_QA chunks found in DB. Run 09_generate_synthetic_qa.py first.")
        sys.exit(1)

    print(f"Benchmarking {len(qa_pairs)} Q&A pairs (top-{TOP_K} retrieval)")
    print("=" * 60)

    hits = 0
    faithfulness_scores = []
    results = []
    start = time.time()

    for i, qa in enumerate(qa_pairs):
        try:
            # 1. Embed the question
            query_emb = embed_query(qa["question"])
            emb_str = vector_to_string(query_emb)

            # 2. Retrieve top-K chunks
            chunks = retrieve_chunks(conn, emb_str, TOP_K)

            # 3. Check hit: did we retrieve a chunk from the same source regulation?
            retrieved_source_ids = [row[2] for row in chunks]  # source_id column
            hit = qa["source_id"] in retrieved_source_ids
            if hit:
                hits += 1

            # 4. Build context from retrieved chunks
            context = "\n---\n".join(row[4] for row in chunks)  # chunk_text column

            # 5. Score faithfulness (only if we got context)
            faith_score = -1
            faith_reason = ""
            if chunks:
                faith_score, faith_reason = score_faithfulness(
                    qa["question"], qa["answer"], context
                )
                if faith_score >= 0:
                    faithfulness_scores.append(faith_score)

            top_sim = float(chunks[0][7]) if chunks else 0.0  # similarity column

            result = {
                "question": qa["question"],
                "source_id": qa["source_id"],
                "hit": hit,
                "top_similarity": round(top_sim, 4),
                "faithfulness_score": faith_score,
                "faithfulness_reason": faith_reason,
                "retrieved_sources": retrieved_source_ids[:3],
            }
            results.append(result)

            status = "HIT" if hit else "MISS"
            faith_str = f"{faith_score:.1f}" if faith_score >= 0 else "ERR"
            print(f"  [{i+1}/{len(qa_pairs)}] {status} faith={faith_str} sim={top_sim:.3f} | {qa['question'][:60]}")

            # Rate limit: embedding + faithfulness scoring
            time.sleep(1.5)

        except Exception as e:
            print(f"  [{i+1}/{len(qa_pairs)}] ERROR: {e}")
            results.append({"question": qa["question"], "error": str(e)})

    elapsed = time.time() - start

    # Summary
    hit_rate = hits / len(qa_pairs) if qa_pairs else 0
    avg_faith = sum(faithfulness_scores) / len(faithfulness_scores) if faithfulness_scores else 0

    print()
    print("=" * 60)
    print(f"RAG BENCHMARK RESULTS")
    print(f"=" * 60)
    print(f"  Q&A pairs tested:  {len(qa_pairs)}")
    print(f"  Top-K:             {TOP_K}")
    print(f"  Hit Rate:          {hits}/{len(qa_pairs)} = {hit_rate:.1%}")
    print(f"  Avg Faithfulness:  {avg_faith:.2f} ({len(faithfulness_scores)} scored)")
    print(f"  Time:              {elapsed:.0f}s")
    print()

    if hit_rate < 0.70:
        print("  WARNING: Hit rate < 70% — chunk quality may need improvement")
    else:
        print("  PASS: Hit rate >= 70%")

    if avg_faith < 0.70:
        print("  WARNING: Faithfulness < 70% — risk of hallucination")
    else:
        print("  PASS: Faithfulness >= 70%")

    # Save detailed results
    summary = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "total_pairs": len(qa_pairs),
        "top_k": TOP_K,
        "hit_rate": round(hit_rate, 4),
        "hits": hits,
        "avg_faithfulness": round(avg_faith, 4),
        "faithfulness_count": len(faithfulness_scores),
        "elapsed_seconds": round(elapsed, 1),
        "results": results,
    }

    with open(OUTPUT_FILE, "w") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)
    print(f"\nDetailed results saved to: {OUTPUT_FILE}")

    conn.close()


if __name__ == "__main__":
    main()
