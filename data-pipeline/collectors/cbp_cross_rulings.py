"""
Collector: US CBP CROSS — Customs Rulings Online Search System

ฐานข้อมูลคำวินิจฉัยพิกัดศุลกากรของสหรัฐฯ นับแสนรายการ
HS Code 6 หลักแรกเหมือนกันทั้งโลก → ใช้อ้างอิงกับไทยได้

มี JSON API ฟรี! ไม่ต้อง scrape

Provenance: source_url = https://rulings.cbp.gov/ruling/{ruling_number}
"""

import os
import sys
import json
import time
import requests
from tqdm import tqdm

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from config import RAW_DIR

OUTPUT_DIR = os.path.join(RAW_DIR, "cbp-cross")
BASE_URL = "https://rulings.cbp.gov/api"

SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": "Mozilla/5.0 (compatible; CustomsGuard-DataPipeline/1.0)",
    "Accept": "application/json",
})

# HS Chapters ที่สำคัญสำหรับไทย (นำเข้า-ส่งออกมาก)
PRIORITY_CHAPTERS = [
    "01", "02", "03", "04",        # อาหาร สัตว์ ปลา
    "08", "09", "10", "11",        # ผลไม้ กาแฟ ข้าว
    "15", "16", "17", "18", "19",  # น้ำมัน อาหารแปรรูป
    "27", "28", "29",              # น้ำมันเชื้อเพลิง เคมี
    "32", "33", "34",              # สี เครื่องสำอาง สบู่
    "38", "39", "40",              # เคมี พลาสติก ยาง
    "44",                          # ไม้
    "48",                          # กระดาษ
    "54", "55",                    # เส้นใยสังเคราะห์
    "61", "62", "63",              # เสื้อผ้า
    "70", "71", "72", "73",        # แก้ว อัญมณี เหล็ก
    "76",                          # อลูมิเนียม
    "84", "85",                    # เครื่องจักร ไฟฟ้า
    "87",                          # รถยนต์
    "90",                          # เครื่องมือวิทยาศาสตร์
    "94", "95", "96",              # เฟอร์นิเจอร์ ของเล่น
]


def search_rulings(hs_chapter: str, page: int = 1, per_page: int = 50) -> dict | None:
    """Search CBP CROSS rulings by HS chapter."""
    try:
        resp = SESSION.get(
            f"{BASE_URL}/search",
            params={
                "term": hs_chapter,
                "collection": "ALL",
                "page": page,
                "per_page": per_page,
            },
            timeout=30,
        )
        if resp.ok:
            return resp.json()
    except Exception as e:
        print(f"  Error searching chapter {hs_chapter}: {e}")
    return None


def get_ruling_detail(ruling_number: str) -> dict | None:
    """Get full ruling text by ruling number."""
    try:
        resp = SESSION.get(
            f"{BASE_URL}/ruling/{ruling_number}",
            timeout=30,
        )
        if resp.ok:
            return resp.json()
    except Exception as e:
        print(f"  Error fetching ruling {ruling_number}: {e}")
    return None


def collect():
    """Main entry point: download CBP CROSS rulings for priority HS chapters."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    all_rulings = []
    total_found = 0

    for chapter in tqdm(PRIORITY_CHAPTERS, desc="CBP CROSS chapters"):
        chapter_file = os.path.join(OUTPUT_DIR, f"chapter_{chapter}.json")

        if os.path.exists(chapter_file):
            with open(chapter_file, "r") as f:
                data = json.load(f)
            total_found += len(data)
            continue

        chapter_rulings = []
        page = 1

        while True:
            result = search_rulings(chapter, page=page)
            if not result:
                break

            rulings = result.get("results", result.get("data", []))
            if not rulings:
                break

            for ruling in rulings:
                ruling_num = ruling.get("rulingNumber", ruling.get("ruling_number", ""))
                chapter_rulings.append({
                    "ruling_number": ruling_num,
                    "hs_code": ruling.get("tariffNumber", ruling.get("hs_code", "")),
                    "subject": ruling.get("subject", ""),
                    "date": ruling.get("date", ""),
                    "status": ruling.get("status", ""),
                    "source_url": f"https://rulings.cbp.gov/ruling/{ruling_num}",
                })

            # Check if more pages
            total_pages = result.get("totalPages", result.get("total_pages", 1))
            if page >= total_pages or page >= 10:  # Cap at 10 pages per chapter
                break
            page += 1
            time.sleep(0.5)

        # Save chapter file
        with open(chapter_file, "w", encoding="utf-8") as f:
            json.dump(chapter_rulings, f, ensure_ascii=False, indent=2)

        total_found += len(chapter_rulings)
        time.sleep(1)  # Polite delay

    # Save manifest
    manifest = {
        "total_rulings": total_found,
        "chapters_collected": PRIORITY_CHAPTERS,
    }
    with open(os.path.join(OUTPUT_DIR, "_manifest.json"), "w") as f:
        json.dump(manifest, f, indent=2)

    print(f"\n[cbp] Total rulings collected: {total_found}")
    return OUTPUT_DIR


if __name__ == "__main__":
    collect()
