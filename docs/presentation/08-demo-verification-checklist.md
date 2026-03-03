# Demo Verification Checklist — ทำก่อนไปพบชิปปิ้ง

---

## สิ่งที่ต้องเตรียม

- [ ] **Laptop** ที่ลง Chrome Extension + backend รันบน Docker ได้
- [ ] **ตัวอย่าง PDF** ใบขน/Invoice 2-3 ฉบับ (ขอจากชิปปิ้งก่อนถ้าได้ หรือใช้ตัวอย่างปลอม)
- [ ] **พิมพ์เอกสาร 2 ชุด** (ให้ชิปปิ้ง 1 ชุด เก็บ 1 ชุด):
  - 01-one-page-summary-handout.md (ตาราง "ก่อน vs หลัง" + Visual Flow + สูตร FTA)
  - 02-roi-table.md (ตาราง ROI)
- [ ] **สมุดจดโน้ต + ปากกา**
- [ ] **Screenshot backup** เผื่อ internet ช้า/ไม่มี

---

## ทดสอบ Demo Flow

### Step 1: เริ่ม Infrastructure
```bash
# เริ่ม PostgreSQL + Redis + MinIO
docker compose -f docker-compose.dev.yml up -d

# ตรวจสอบว่า container ทำงาน
docker compose -f docker-compose.dev.yml ps
```
- [ ] PostgreSQL running (port 5432)
- [ ] Redis running (port 6379)
- [ ] MinIO running (port 9000/9001)

### Step 2: เริ่ม Backend
```bash
cd backend-core
DB_USERNAME=saas_admin DB_PASSWORD=dev_password_2024 GEMINI_API_KEY=<key> ./gradlew :platform-app:bootRun
```
- [ ] Backend starts without errors
- [ ] Flyway migrations run (13 migrations)
- [ ] Backend responds at http://localhost:8080

### Step 3: ขอ Dev Token
```bash
curl -X POST http://localhost:8080/v1/auth/dev-token
```
- [ ] ได้ JWT token กลับมา

### Step 4: ทดสอบ Semantic Search
```bash
curl -X POST http://localhost:8080/v1/customsguard/hs-codes/semantic \
  -H "Authorization: Bearer <token>" \
  -H "X-Tenant-ID: a0000000-0000-0000-0000-000000000001" \
  -H "Content-Type: application/json" \
  -d '{"query": "frozen shrimp", "limit": 5}'
```
- [ ] คืนผลลัพธ์ HS Code ที่สมเหตุสมผล
- [ ] มี similarity score

### Step 5: ทดสอบ FTA Lookup
```bash
curl -X POST http://localhost:8080/v1/customsguard/hs/lookup \
  -H "Authorization: Bearer <token>" \
  -H "X-Tenant-ID: a0000000-0000-0000-0000-000000000001" \
  -H "Content-Type: application/json" \
  -d '{"hsCodes": ["0306.17"]}'
```
- [ ] FTA alert ขึ้นถูกต้อง
- [ ] แสดงตัวเลขเงินประหยัด / ส่วนต่างอัตรา

### Step 6: ทดสอบ PDF Upload
```bash
curl -X POST http://localhost:8080/v1/customsguard/scan \
  -H "Authorization: Bearer <token>" \
  -H "X-Tenant-ID: a0000000-0000-0000-0000-000000000001" \
  -F "file=@test.pdf"
```
- [ ] Upload สำเร็จ ได้ jobId
- [ ] Poll status จนได้ผลลัพธ์

### Step 7: ทดสอบ Chrome Extension
```bash
cd chrome-extension/cgai
npm run build
```
- [ ] Build สำเร็จ (ไม่มี error)
- [ ] โหลด dist/ ใน Chrome Developer mode
- [ ] Extension icon ปรากฏ
- [ ] Side panel เปิดได้
- [ ] PDF Drag & Drop ทำงาน
- [ ] Semantic search ทำงาน
- [ ] FTA lookup แสดงผล

### Step 8: ทดสอบ Auto-Save
- [ ] กรอกข้อมูลใน Extension
- [ ] ปิด browser
- [ ] เปิดใหม่ → ข้อมูลยังอยู่

### Step 9: เตรียม Screenshot Backup
- [ ] Screenshot: หน้า PDF scan result
- [ ] Screenshot: หน้า HS Code semantic search
- [ ] Screenshot: หน้า FTA savings alert
- [ ] Screenshot: หน้า Chat Panel (RAG search)
- [ ] เก็บ screenshot ไว้ใน folder ที่เข้าถึงง่าย

---

## ซ้อม Demo

- [ ] ซ้อม demo 2-3 รอบ
- [ ] จับเวลาไม่เกิน 20 นาที
- [ ] ซ้อมหมัดฮุก 30 วินาที จนพูดได้เป็นธรรมชาติ
- [ ] ซ้อม FAQ — ให้คนอื่นถามแล้วตอบจนลื่น
- [ ] ทดสอบ offline scenario — ถ้า internet ช้า demo ยังดูดีมั้ย

---

## วันไปพบชิปปิ้ง — Checklist สุดท้าย

- [ ] ชาร์จ laptop เต็ม
- [ ] Docker compose up + backend running
- [ ] Chrome Extension loaded
- [ ] PDF ตัวอย่าง 2-3 ฉบับพร้อม
- [ ] เอกสารพิมพ์ 2 ชุด
- [ ] สมุดจดโน้ต + ปากกา
- [ ] Screenshot backup ในเครื่อง
- [ ] Internet fallback (hotspot มือถือ)
