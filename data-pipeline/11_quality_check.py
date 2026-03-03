#!/usr/bin/env python3
"""
Script 11: Quality check — test queries + provenance validation

Runs test queries against the RAG pipeline and validates provenance URLs.
No AI credits consumed (uses only DB queries and HTTP HEAD checks).
"""

import os
import sys
import json
import random
import requests

sys.path.insert(0, os.path.dirname(__file__))
from config import get_db_conn
from utils.gcp_vertex_client import embed_text

# Test queries covering various customs scenarios
TEST_QUERIES = [
    "นำเข้ารถยนต์ไฟฟ้าเสียภาษีเท่าไหร่",
    "ส่งออกข้าวต้องมีใบอนุญาตไหม",
    "สินค้าจากจีนใช้ Form อะไร ลดภาษีเท่าไหร่",
    "พิกัดรหัสสำหรับเครื่องสำอาง",
    "RCEP ลดภาษีอะไรบ้าง",
    "นำเข้าอาหารสัตว์ต้องเสียภาษีเท่าไหร่",
    "HS code สำหรับชิ้นส่วนอิเล็กทรอนิกส์",
    "สิทธิ FTA ASEAN กับ form D",
    "กฎถิ่นกำเนิดสินค้า JTEPA",
    "ประกาศกรมศุลกากรล่าสุด",
    "วินิจฉัยพิกัดสินค้าพลาสติก",
    "ภาษีนำเข้าเหล็ก",
    "HS code for mobile phone",
    "customs tariff for EV battery",
    "FTA rate for Japanese car parts",
    "import duty for cosmetics from Korea",
    "ข้อยกเว้นภาษีเขตปลอดอากร",
    "การคำนวณราคาศุลกากร",
    "ใบขนสินค้าคืออะไร",
    "HS 8703 อัตราอากรเท่าไหร่",
]


def test_semantic_search(conn, query: str) -> dict:
    """Run a semantic search query against cg_document_chunks."""
    embedding = embed_text(query)
    vec_str = "[" + ",".join(str(v) for v in embedding) + "]"

    with conn.cursor() as cur:
        cur.execute("""
            SELECT chunk_text, content_summary, metadata, source_type,
                   1 - (embedding <=> %s::vector) AS similarity
            FROM cg_document_chunks
            ORDER BY embedding <=> %s::vector
            LIMIT 5
        """, (vec_str, vec_str))
        results = cur.fetchall()

    return {
        "query": query,
        "results": [
            {
                "chunk_text": r[0][:200],
                "summary": r[1],
                "metadata": json.loads(r[2]) if isinstance(r[2], str) else r[2],
                "source_type": r[3],
                "similarity": round(float(r[4]), 4),
            }
            for r in results
        ],
    }


def test_hs_search(conn, query: str) -> dict:
    """Run a semantic search against cg_hs_codes."""
    embedding = embed_text(query)
    vec_str = "[" + ",".join(str(v) for v in embedding) + "]"

    with conn.cursor() as cur:
        cur.execute("""
            SELECT code, description_th, description_en, base_rate,
                   1 - (embedding <=> %s::vector) AS similarity
            FROM cg_hs_codes
            WHERE embedded = TRUE
            ORDER BY embedding <=> %s::vector
            LIMIT 5
        """, (vec_str, vec_str))
        results = cur.fetchall()

    return {
        "query": query,
        "results": [
            {
                "code": r[0],
                "desc_th": r[1],
                "desc_en": r[2],
                "base_rate": float(r[3]) if r[3] else None,
                "similarity": round(float(r[4]), 4),
            }
            for r in results
        ],
    }


def validate_provenance(conn, sample_size: int = 20) -> dict:
    """Validate provenance URLs by sampling records and checking accessibility."""
    results = {"checked": 0, "valid": 0, "invalid": 0, "errors": []}

    # Sample from each table
    tables = [
        ("cg_regulations", "source_url"),
    ]

    with conn.cursor() as cur:
        for table, url_col in tables:
            cur.execute(f"""
                SELECT {url_col} FROM {table}
                WHERE {url_col} IS NOT NULL
                ORDER BY RANDOM()
                LIMIT %s
            """, (sample_size,))
            urls = [row[0] for row in cur.fetchall()]

            for url in urls:
                results["checked"] += 1
                try:
                    resp = requests.head(url, timeout=10, allow_redirects=True, headers={
                        "User-Agent": "Mozilla/5.0 (compatible; CustomsGuard-QA/1.0)"
                    })
                    if resp.status_code < 400:
                        results["valid"] += 1
                    else:
                        results["invalid"] += 1
                        results["errors"].append({
                            "table": table,
                            "url": url,
                            "status": resp.status_code,
                        })
                except Exception as e:
                    results["invalid"] += 1
                    results["errors"].append({
                        "table": table,
                        "url": url,
                        "error": str(e),
                    })

    return results


def check_data_counts(conn) -> dict:
    """Get record counts and basic statistics."""
    stats = {}
    with conn.cursor() as cur:
        # HS codes
        cur.execute("SELECT COUNT(*) FROM cg_hs_codes")
        stats["hs_codes_total"] = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM cg_hs_codes WHERE embedded = TRUE")
        stats["hs_codes_embedded"] = cur.fetchone()[0]

        # FTA rates
        cur.execute("SELECT COUNT(*) FROM cg_fta_rates")
        stats["fta_rates_total"] = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM cg_fta_rates WHERE source_url IS NOT NULL")
        stats["fta_rates_with_provenance"] = cur.fetchone()[0]

        # Regulations
        cur.execute("SELECT COUNT(*) FROM cg_regulations")
        stats["regulations_total"] = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM cg_regulations WHERE source_url IS NOT NULL")
        stats["regulations_with_provenance"] = cur.fetchone()[0]

        # Document chunks
        cur.execute("SELECT COUNT(*) FROM cg_document_chunks")
        stats["chunks_total"] = cur.fetchone()[0]
        cur.execute("SELECT source_type, COUNT(*) FROM cg_document_chunks GROUP BY source_type")
        stats["chunks_by_type"] = dict(cur.fetchall())

    return stats


def main():
    conn = get_db_conn()

    print("=" * 60)
    print("  QUALITY CHECK — CustomsGuard Knowledge Base")
    print("=" * 60)

    # 1. Data counts
    print("\n1. DATA COUNTS")
    print("-" * 40)
    stats = check_data_counts(conn)
    for key, value in stats.items():
        print(f"  {key}: {value}")

    # 2. Semantic search tests
    print("\n2. SEMANTIC SEARCH TESTS (10 queries)")
    print("-" * 40)
    test_subset = random.sample(TEST_QUERIES, min(10, len(TEST_QUERIES)))
    search_scores = []

    for query in test_subset:
        result = test_semantic_search(conn, query)
        top_sim = result["results"][0]["similarity"] if result["results"] else 0
        search_scores.append(top_sim)
        has_source = any(
            r["metadata"].get("source_url")
            for r in result["results"]
        )
        print(f"  Q: {query}")
        print(f"    Top similarity: {top_sim:.4f} | Has provenance: {has_source}")
        if result["results"]:
            print(f"    Top result: {result['results'][0]['chunk_text'][:100]}...")
        print()

    avg_sim = sum(search_scores) / len(search_scores) if search_scores else 0
    print(f"  Average top similarity: {avg_sim:.4f}")

    # 3. HS code search tests
    print("\n3. HS CODE SEARCH TESTS (5 queries)")
    print("-" * 40)
    hs_queries = random.sample(TEST_QUERIES, min(5, len(TEST_QUERIES)))
    for query in hs_queries:
        result = test_hs_search(conn, query)
        if result["results"]:
            top = result["results"][0]
            print(f"  Q: {query}")
            print(f"    Top: {top['code']} — {top['desc_th'] or top['desc_en']} (sim: {top['similarity']:.4f})")

    # 4. Provenance validation
    print("\n4. PROVENANCE VALIDATION (20 URLs)")
    print("-" * 40)
    prov = validate_provenance(conn, sample_size=20)
    print(f"  Checked: {prov['checked']}")
    print(f"  Valid: {prov['valid']}")
    print(f"  Invalid: {prov['invalid']}")
    if prov["errors"]:
        print("  Errors:")
        for err in prov["errors"][:5]:
            print(f"    - {err.get('url', 'N/A')}: {err.get('status', err.get('error', 'unknown'))}")

    # Save report
    report = {
        "stats": stats,
        "avg_similarity": avg_sim,
        "provenance": prov,
    }
    report_path = os.path.join(os.path.dirname(__file__), "data", "quality_report.json")
    os.makedirs(os.path.dirname(report_path), exist_ok=True)
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, ensure_ascii=False, indent=2, default=str)
    print(f"\nReport saved to: {report_path}")

    conn.close()


if __name__ == "__main__":
    main()
