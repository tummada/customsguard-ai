# คู่มือตั้ง GCP สำหรับ CustomsGuard Data Pipeline

## ภาพรวม

```
Cloud Shell                    GCP VM                       เครื่อง local
───────────                    ──────                       ────────────
gcp-setup.sh ──สร้าง──→ VM + Cloud SQL
                               vm-setup.sh
                               python 00_collect...
                               python 01-12...
                               ./13_pg_dump.sh
                                    │
                                    └──→ .dump file ──download──→ 14_pg_restore.sh
                                                                  ใช้ได้ฟรีตลอด
```

**ค่าใช้จ่าย infra:** ~$25/เดือน (Cloud SQL $9 + VM $15 + Storage $1)
**ที่เหลือ $275** ใช้กับ Vertex AI (Gemini Vision + Flash)

---

## ขั้นที่ 1: เปิด Cloud Shell

1. ไปที่ **https://shell.cloud.google.com**
2. Login ด้วย Google account ที่มี $300 credit
3. จะเห็นหน้าจอ terminal ดำๆ — นี่คือ Cloud Shell (ฟรี มี `gcloud` พร้อมใช้)

## ขั้นที่ 2: Clone repo ขึ้น Cloud Shell

```bash
# ถ้า repo อยู่บน GitHub:
git clone <your-repo-url> aiservice
cd aiservice/data-pipeline

# ถ้า repo อยู่ local อย่างเดียว ให้ upload ทั้งโฟลเดอร์:
# กดไอคอน ⋮ (มุมขวาบน) → Upload folder → เลือก data-pipeline/
```

## ขั้นที่ 3: รัน gcp-setup.sh (สร้างทุกอย่างอัตโนมัติ)

```bash
# ตั้ง project ID (เปลี่ยนเป็นของจริง)
gcloud config set project YOUR-PROJECT-ID

# รัน setup
chmod +x gcp-setup.sh
./gcp-setup.sh
```

**script จะสร้างให้อัตโนมัติ:**
- เปิด APIs (Vertex AI, Cloud SQL, Compute Engine, Storage)
- สร้าง Cloud SQL PostgreSQL 16 + pgvector (~5-10 นาที)
- สร้าง VM e2-small (~1-2 นาที)
- สร้าง Storage buckets
- สร้างไฟล์ .env พร้อม DB connection

**รวมใช้เวลา ~10 นาที**

## ขั้นที่ 4: SSH เข้า VM

```bash
gcloud compute ssh customsguard-pipeline --zone=us-central1-a
```

- พิมพ์ `y` ถ้าถาม
- กด Enter 2 ครั้ง (ไม่ต้องใส่ passphrase)

## ขั้นที่ 5: Copy ไฟล์ไป VM

**เปิด Cloud Shell tab ใหม่** (กด +) แล้วรัน:

```bash
gcloud compute scp --recurse ~/aiservice customsguard-pipeline:~/ --zone=us-central1-a
```

## ขั้นที่ 6: บน VM — รัน vm-setup.sh

กลับมาที่ VM terminal (tab แรก):

```bash
cd ~/aiservice/data-pipeline
chmod +x vm-setup.sh
./vm-setup.sh
```

**script จะทำให้อัตโนมัติ:**
- ติดตั้ง Python, pip, postgresql-client
- สร้าง venv + ติดตั้ง dependencies
- เปิด pgvector extension บน Cloud SQL
- รัน migrations (สร้างตาราง cg_hs_codes, cg_fta_rates, ฯลฯ)
- ตรวจสอบ connection

## ขั้นที่ 7: ใส่ GEMINI_API_KEY

```bash
nano .env
# แก้บรรทัด: GEMINI_API_KEY=__ใส่_API_KEY_ตรงนี้__
# ไปเอา key ที่: https://aistudio.google.com/app/apikey
# กด Ctrl+O → Enter (บันทึก)
# กด Ctrl+X (ออก)
```

## ขั้นที่ 8: เริ่มรัน Pipeline

```bash
# ใช้ tmux — ปิด SSH ได้โดย script ยังรันต่อ
tmux new -s pipeline

# เข้า venv
source venv/bin/activate

# ── สัปดาห์ 1: ดาวน์โหลดข้อมูลดิบ (ฟรี) ──
python 00_collect_raw_data.py

# ── สัปดาห์ 1: HS Codes ──
python 01_parse_hs_codes_csv.py    # CSV → DB (ฟรี)
python 02_extract_hs_from_pdf.py   # PDF → Gemini Vision (เสียเงิน)
python 03_embed_hs_codes.py        # Embed (ฟรี)

# ── สัปดาห์ 2: FTA + กฎระเบียบ ──
python 04_parse_fta_rates.py
python 05_parse_ecs_regulations.py
python 06_extract_rulings_pdf.py   # เสียเงิน

# ── สัปดาห์ 3: AI Enrichment ──
python 07_chunk_and_embed.py
python 08_enrich_summaries.py      # เสียเงิน
python 09_generate_synthetic_qa.py # เสียเงิน
python 10_cross_reference.py       # เสียเงิน

# ── สัปดาห์ 4: QA + Export ──
python 11_quality_check.py
python 12_optimize_indexes.py
./13_pg_dump.sh
```

---

## เทคนิค tmux (สำคัญมาก)

tmux ทำให้ script รันต่อได้แม้ปิด SSH หรือเน็ตหลุด:

```bash
# สร้าง session ใหม่
tmux new -s pipeline

# ออกจาก tmux (script ยังรัน): กด Ctrl+B แล้วกด D
# กลับเข้า tmux:
tmux attach -t pipeline

# ดูว่ามี session อะไรบ้าง:
tmux ls
```

**ถ้าปิด SSH แล้วกลับมา:**
```bash
gcloud compute ssh customsguard-pipeline --zone=us-central1-a
tmux attach -t pipeline
# จะเห็น script ยังรันอยู่!
```

---

## ดู Progress

```bash
# ดูว่า script ไหนทำไปถึงไหนแล้ว
source .env
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
  SELECT pipeline_name, status, COUNT(*)
  FROM _pipeline_state
  GROUP BY 1,2
  ORDER BY 1,2;
"

# ดูจำนวนข้อมูลในแต่ละตาราง
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
  SELECT 'cg_hs_codes' AS t, COUNT(*) FROM cg_hs_codes UNION ALL
  SELECT 'cg_fta_rates', COUNT(*) FROM cg_fta_rates UNION ALL
  SELECT 'cg_regulations', COUNT(*) FROM cg_regulations UNION ALL
  SELECT 'cg_document_chunks', COUNT(*) FROM cg_document_chunks UNION ALL
  SELECT 'cg_ad_duties', COUNT(*) FROM cg_ad_duties UNION ALL
  SELECT 'cg_excise_rates', COUNT(*) FROM cg_excise_rates UNION ALL
  SELECT 'cg_boi_privileges', COUNT(*) FROM cg_boi_privileges UNION ALL
  SELECT 'cg_lpi_controls', COUNT(*) FROM cg_lpi_controls;
"
```

---

## ถ้า Script พัง / Error

**ไม่ต้องตกใจ — รันคำสั่งเดิมอีกครั้ง** มันจะข้ามตัวที่ทำเสร็จแล้วอัตโนมัติ

```bash
# ดู error ที่เกิดขึ้น
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "
  SELECT pipeline_name, source_key, error_message
  FROM _pipeline_state
  WHERE status = 'FAILED'
  LIMIT 10;
"

# รัน script เดิมซ้ำ — จะทำเฉพาะตัวที่ยังไม่เสร็จ
python 06_extract_rulings_pdf.py
```

---

## ดาวน์โหลด dump กลับเครื่อง local

**ขั้น A: บน VM — สร้าง dump**
```bash
./13_pg_dump.sh
# ไฟล์จะอยู่ที่ data/dumps/customsguard_kb_XXXXXXXX.dump
```

**ขั้น B: จาก Cloud Shell — ดึงไฟล์ออกจาก VM**
```bash
gcloud compute scp customsguard-pipeline:~/aiservice/data-pipeline/data/dumps/latest.dump \
  ~/customsguard_kb.dump --zone=us-central1-a

# แล้ว download จาก Cloud Shell ไปเครื่อง local:
# กด ⋮ → Download → ~/customsguard_kb.dump
```

**ขั้น C: ที่เครื่อง local — restore เข้า Docker**
```bash
cd data-pipeline
./14_pg_restore.sh ~/Downloads/customsguard_kb.dump
```

---

## วันที่ 30: ลบ GCP ทุกอย่าง

```bash
# ลบ VM
gcloud compute instances delete customsguard-pipeline --zone=us-central1-a --quiet

# ลบ Cloud SQL
gcloud sql instances delete customsguard-db --quiet

# ลบ Buckets
gcloud storage rm -r gs://YOUR-PROJECT-customsguard-raw
gcloud storage rm -r gs://YOUR-PROJECT-customsguard-processed
```

**หลังลบ:** ไม่เสียค่าใช้จ่ายอีก ข้อมูลทั้งหมดอยู่ในไฟล์ .dump ที่ download มาแล้ว

---

## สรุปค่าใช้จ่าย

| รายการ | ต่อเดือน | 30 วัน |
|--------|---------|--------|
| Cloud SQL db-f1-micro | ~$9 | $9 |
| VM e2-small | ~$15 | $15 |
| Storage | ~$1 | $1 |
| **Infra รวม** | | **$25** |
| Gemini Vision (Vertex AI) | | ~$200 |
| Gemini Flash (Vertex AI) | | ~$60 |
| Embedding (free tier) | | $0 |
| **รวมทั้งหมด** | | **~$285** |

**เหลือสำรอง: ~$15**

---

## Checklist

- [ ] สร้าง GCP project + ผูก billing ($300 credit)
- [ ] รัน `gcp-setup.sh` จาก Cloud Shell
- [ ] SSH เข้า VM + รัน `vm-setup.sh`
- [ ] ใส่ GEMINI_API_KEY ใน .env
- [ ] ขอ Vertex AI quota เพิ่ม (ถ้าต่ำกว่า 60 RPM)
- [ ] รัน `00_collect_raw_data.py` (ฟรี)
- [ ] รัน `01-03` (HS Codes — ส่วนใหญ่ฟรี)
- [ ] pg_dump สัปดาห์ 1 (backup)
- [ ] รัน `04-06` (FTA + Regulations)
- [ ] pg_dump สัปดาห์ 2 (backup)
- [ ] รัน `07-10` (Enrich + Q&A)
- [ ] pg_dump สัปดาห์ 3 (backup)
- [ ] รัน `11-12` (QA + Optimize)
- [ ] `13_pg_dump.sh` (final dump)
- [ ] Download .dump กลับเครื่อง local
- [ ] `14_pg_restore.sh` ที่เครื่อง local
- [ ] ทดสอบ API endpoints
- [ ] ลบ GCP ทุกอย่าง

---

## แหล่งข้อมูลทั้งหมด (11 แหล่ง)

### Tier 1 — Core Data (กระดูกสันหลัง)

| # | แหล่ง | ข้อมูล | ตาราง DB | ฟรี? |
|---|-------|--------|---------|------|
| 1 | data.go.th | HS codes 12,000 รายการ | cg_hs_codes | ฟรี |
| 2 | customs.go.th | คำวินิจฉัยพิกัด + พ.ร.ก. (PDF) | cg_regulations | เสียเงิน (Vision) |
| 3 | ecs-support.github.io | ประกาศกรมศุลกากร (HTML) | cg_regulations | ฟรี |
| 4 | thailandntr.com | อัตรา FTA ทุก agreement | cg_fta_rates | ฟรี |
| 5 | tax.dtn.go.th | เปรียบเทียบอัตรา FTA | cg_fta_rates | ฟรี |
| 6 | ratchakitcha.soc.go.th | ราชกิจจานุเบกษา (PDF) | cg_regulations | เสียเงิน (Vision) |

### Tier 2 — Expert-level Data (ความสมบูรณ์แบบ)

| # | แหล่ง | ข้อมูล | ตาราง DB | ฟรี? |
|---|-------|--------|---------|------|
| 7 | **rulings.cbp.gov** | คำวินิจฉัย US Customs (JSON API) | cg_regulations | **ฟรี!** |
| 8 | **dft.go.th** | Anti-Dumping / CVD ภาษีพิเศษ | **cg_ad_duties** | ฟรี/ปานกลาง |
| 9 | **excise.go.th** | ภาษีสรรพสามิตนำเข้า | **cg_excise_rates** | ฟรี/ปานกลาง |
| 10 | **boi.go.th** | สิทธิ BOI ยกเว้น/ลดอากร | **cg_boi_privileges** | ฟรี/ปานกลาง |
| 11 | **thainsw.net + อย./สมอ.** | ของต้องกำกัด / ใบอนุญาต | **cg_lpi_controls** | ฟรี |

### ทำไม Tier 2 สำคัญ

```
ถ้ามีแค่ Tier 1:
  User: "นำเข้าเหล็กจากจีน HS 7208 ภาษีเท่าไหร่?"
  AI:   "อากรศุลกากร 5%"  ← ผิด! ไม่ได้บอกว่าโดน AD อีก 40%

ถ้ามี Tier 2 ด้วย:
  AI:   "อากรศุลกากร 5%
         ⚠️ Anti-Dumping จากจีน +40.97%
         ⚠️ รวมภาษีจริง 45.97%
         💡 ถ้ามี BOI ม.28 อาจยกเว้นอากรได้
         📋 ต้องมีใบ สมอ. (มอก.)"
```
