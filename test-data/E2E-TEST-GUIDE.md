# คู่มือทดสอบ E2E: CustomsGuard Chrome Extension

## สถานะปัจจุบัน

Backend รันอยู่ที่ `http://localhost:8080` แล้ว พร้อมทดสอบ

---

## ไฟล์ทดสอบที่สร้างไว้

| ไฟล์ | ที่อยู่ | ขนาด | ใช้ทำอะไร |
|------|---------|-------|-----------|
| test-invoice.pdf | `test-data/test-invoice.pdf` | 1.5 KB (1 หน้า) | อัพโหลดทดสอบ scan — มี 5 รายการ HS code |
| test-invoice-large.pdf | `test-data/test-invoice-large.pdf` | 5.8 MB (1000 หน้า) | ทดสอบ upload ไฟล์ใหญ่ |
| mock-worker.sh | `test-data/mock-worker.sh` | shell script | จำลอง n8n ทำงานเสร็จ (เปลี่ยน job → COMPLETED) |

### เนื้อหาใน test-invoice.pdf

```
COMMERCIAL INVOICE
Invoice No: INV-2026-001
Seller: Thai Export Co., Ltd.
Buyer: Japan Import Corp.

รายการสินค้า 5 รายการ:
1. Semi-milled rice 5% broken      HS 1006.30   500 ชิ้น   CIF 60,000 USD
2. Frozen shrimps HOSO              HS 0306.17   200 ชิ้น   CIF 70,000 USD
3. Laptop Dell 15 inch              HS 8471.30   50 ชิ้น    CIF 1,250,000 USD
4. Pneumatic tyres radial           HS 4011.10   100 ชิ้น   CIF 250,000 USD
5. Frozen chicken cuts              HS 0207.14   300 ชิ้น   CIF 54,000 USD
```

---

## ขั้นตอนทดสอบ

### ขั้น 1: เปิด Chrome Extension

1. เปิด Chrome ไปที่ `chrome://extensions/`
2. เปิด **Developer mode** (มุมขวาบน)
3. กด **Load unpacked** → เลือกโฟลเดอร์ `chrome-extension/cgai/dist/`
4. จะเห็น Extension icon ปรากฏบน toolbar

---

### ขั้น 2: Login

1. คลิกที่ Extension icon → Side Panel เปิดขึ้นมา
2. ไปที่แท็บ **Scan & Review** (ขวาสุด)
3. คลิกไอคอน **ฟันเฟือง** (Settings)
4. กรอกข้อมูล:
   - **Backend URL:** `http://localhost:8080`
   - **Email:** `test@dev.com` (อะไรก็ได้)
   - **Password:** `test` (อะไรก็ได้)
5. กด **Login**
6. **ผลที่ควรได้:** เห็นข้อความ "Connected" พื้นหลังเขียว
7. ปิด dialog → indicator ใน header ควรเป็นสีเขียว

---

### ขั้น 3: ทดสอบ Chat (RAG)

1. ไปที่แท็บ **Chat**
2. พิมพ์: `อัตราอากรนำเข้าข้าว`
3. กด Ask
4. **ผลที่ควรได้:** ตอบกลับว่า "ไม่พบข้อมูลที่เกี่ยวข้อง" (ปกติ — ยังไม่มี document chunks)
5. **ทดสอบ Cache:** ถามคำถามเดิมอีกครั้ง → ควรตอบเร็วกว่าเดิม + อาจเห็น "(cached)"

---

### ขั้น 4: ทดสอบ Scan & Review (E2E เต็มรูปแบบ)

#### 4.1 อัพโหลด PDF

1. ไปที่แท็บ **Scan & Review**
2. **ลาก** ไฟล์ `test-data/test-invoice.pdf` วางลงในพื้นที่ Drop Zone
   - หรือคลิกเพื่อเลือกไฟล์
3. **ผลที่ควรได้:** เห็น preview PDF + จำนวนหน้า (1 หน้า)
4. กด **"Scan with AI"**
5. **ผลที่ควรได้:** เห็นสถานะ "กำลังสแกน..." กับ progress bar

#### 4.2 จำลอง Worker ทำงานเสร็จ (สำคัญมาก!)

Extension จะ poll ถาม backend ทุกๆ ไม่กี่วินาที แต่ job จะค้างที่ "CREATED" เพราะยังไม่มี n8n worker จริง ต้องเปิด terminal อีกอันแล้วรัน:

```bash
cd /home/ipon/workspace/aiservice
bash test-data/mock-worker.sh
```

สคริปต์จะ:
- หา job ที่ status = CREATED อัตโนมัติ
- เปลี่ยนเป็น PROCESSING → COMPLETED
- ใส่ข้อมูล 5 รายการสินค้าพร้อม confidence score

#### 4.3 ดูผลลัพธ์ — Traffic Light (จุดสำคัญ!)

หลัง mock-worker รันเสร็จ Extension จะ poll สำเร็จแล้วแสดงตาราง:

| # | สินค้า | HS Code | Confidence | สี Traffic Light | ความหมาย |
|---|--------|---------|------------|-----------------|----------|
| 1 | ข้าว (Semi-milled rice) | 1006.30 | **95%** | 🟢 **เขียว** | มั่นใจสูง (> 90%) |
| 2 | กุ้งแช่แข็ง (Frozen shrimps) | 0306.17 | **92%** | 🟢 **เขียว** | มั่นใจสูง (> 90%) |
| 3 | แล็ปท็อป (Laptop Dell) | 8471.30 | **88%** | 🟠 **ส้ม** | มั่นใจปานกลาง (60-90%) |
| 4 | ยางรถยนต์ (Pneumatic tyres) | 4011.10 | **72%** | 🟠 **ส้ม** | มั่นใจปานกลาง — hover จะเห็นเหตุผล AI |
| 5 | ไก่แช่แข็ง (Frozen chicken) | 0207.14 | **60%** | 🟠 **ส้ม** | ขอบเขตล่างของปานกลาง — AI ไม่แน่ใจว่า 0207.14 หรือ 0207.27 |

**วิธีดูรายละเอียด:**
- **Hover บนจุดสี** → เห็น tooltip บอก confidence % + เหตุผล AI
- **รายการ confidence ต่ำ** (ส้ม/แดง) จะแสดง `aiReason` อธิบายว่า AI คิดอย่างไร
- เช่น ยาง 4011.10 (72%) → "New pneumatic tyres of rubber, likely HS 4011.10 or 4011.20"
- เช่น ไก่ 0207.14 (60%) → "Frozen chicken parts - could be 0207.14 or 0207.27 depending on bone-in"

**ระดับ Traffic Light:**
```
🟢 เขียว  = confidence > 90%   → "High Confidence" — เชื่อถือได้
🟠 ส้ม    = confidence 60-90%  → "Medium Confidence" — ควรตรวจสอบ
🔴 แดง    = confidence < 60%   → "Low Confidence" — ต้องตรวจสอบแน่นอน
🔵 น้ำเงิน = ผู้ใช้แก้ไขแล้ว      → "Edited" — มนุษย์แก้ไข
🟡 ทอง    = มี FTA              → "FTA Savings Available" — ประหยัดอากรได้
```

#### 4.4 ทดสอบ FTA Alert

หลังจากเห็นรายการสินค้า ระบบจะ auto-lookup FTA rates:
- **กุ้ง 0306.17:** ถ้า origin = CN → เห็น ACFTA ประหยัด 5% (base 5% → FTA 0%)
- **ข้าว 1006.30:** ถ้า origin = VN → เห็น ATIGA ประหยัด 30%

#### 4.5 Confirm & Fill

1. กด **Confirm All** → รายการทั้งหมดเปลี่ยนเป็น CONFIRMED
2. ถ้าอยู่หน้า mock customs form (ดูขั้น 5) → กด **Fill to Customs Form** เพื่อกรอกค่าเข้าฟอร์ม

---

### ขั้น 5: ทดสอบ Magic Fill (ถ้าต้องการ)

1. เปิด terminal แล้วรัน:
   ```bash
   cd /home/ipon/workspace/aiservice/chrome-extension/cgai/dist/public
   python3 -m http.server 8888
   ```
2. เปิด Chrome ไปที่ `http://localhost:8888/mock_customs.html`
3. จะเห็นฟอร์มจำลอง e-Customs ของกรมศุลกากร
4. ไปที่แท็บ **Magic Fill** ใน Extension → กด **Test Fill on Mock**
5. **ผลที่ควรได้:** ฟิลด์ HS Code, CIF Price, Description ถูกกรอกค่า

---

### ขั้น 6: ทดสอบ Logout

1. คลิก Settings → **Logout**
2. **ผลที่ควรได้:** indicator เปลี่ยนเป็นสีแดง
3. ลองใช้ Chat → เห็น "Please login to VOLLOS backend first"

---

## ตรวจสอบ MinIO (เห็นไฟล์ PDF ที่อัพโหลด)

1. เปิด browser ไปที่ `http://localhost:9001`
2. Login: `minioadmin` / `minioadmin`
3. ไปที่ bucket **vollos-dev** → โฟลเดอร์ `customsguard/scans/`
4. จะเห็นไฟล์ PDF ที่อัพโหลดจาก extension

---

## ถ้าเจอปัญหา

| ปัญหา | วิธีแก้ |
|--------|---------|
| Extension ไม่เชื่อมต่อ backend | ตรวจว่า backend รันอยู่: `curl -X POST localhost:8080/v1/auth/dev-token` |
| Login ไม่ผ่าน | ตรวจ CORS: ดู Console ใน DevTools ว่ามี CORS error ไหม |
| Scan ค้างที่ "กำลังสแกน..." | รัน `bash test-data/mock-worker.sh` ใน terminal อีกอัน |
| ไม่เห็น FTA Alert | ต้อง seed HS codes ก่อน: `curl -X POST localhost:8080/v1/customsguard/hs-codes/seed -H "Authorization: Bearer $TOKEN" -H "X-Tenant-ID: a0000000-0000-0000-0000-000000000001"` |
| Upload ไฟล์ใหญ่ fail | ตรวจว่า max-file-size ตั้ง 10MB ใน application.yml |

---

## คำสั่งที่ใช้บ่อย

```bash
# ขอ token
TOKEN=$(curl -s -X POST localhost:8080/v1/auth/dev-token | python3 -c "import sys,json;print(json.load(sys.stdin)['accessToken'])")

# ดูสถานะ job
curl -s "localhost:8080/v1/customsguard/scan/{JOB_ID}" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: a0000000-0000-0000-0000-000000000001" | python3 -m json.tool

# รัน mock worker (จำลอง job เสร็จ)
bash test-data/mock-worker.sh

# รัน mock worker สำหรับ job เฉพาะ
bash test-data/mock-worker.sh {JOB_ID}

# ดู FTA rates ในฐานข้อมูล
docker exec saas-db psql -U saas_admin -d ai_saas_db -c "SELECT hs_code, fta_name, partner_country, preferential_rate FROM cg_fta_rates"
```

---

## สรุปผลทดสอบ Backend (Part 1-2 ผ่านแล้ว)

| Test | ผลลัพธ์ |
|------|---------|
| Docker (postgres, minio, redis) | ✅ 3 containers healthy |
| Flyway migrations (13 files) | ✅ V1-V5 + V1000-V1007 |
| Auth (dev-token + login) | ✅ JWT return ถูกต้อง |
| Security (403 without token) | ✅ |
| HS Code seed (21 codes) | ✅ |
| Embedding (gemini-embedding-001) | ✅ 21 codes embedded |
| Semantic search ("frozen shrimp") | ✅ 0306.17 top result @ 76% |
| FTA lookup (CN origin) | ✅ ACFTA shrimp saving 5% |
| RAG search | ✅ ตอบ "ไม่พบข้อมูล" (expected) |
| PDF upload small (1.5KB) | ✅ |
| PDF upload large (5.8MB, 1.0s) | ✅ |
| Non-PDF rejection | ✅ 400 |
| Mock worker → COMPLETED | ✅ 5 items with confidence |
