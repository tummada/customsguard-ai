# 🤖 AI Orchestration Mastery (v1.3 - The Eternal Engine)

คัมภีร์ชุดนี้กำหนดมาตรฐานการเชื่อมต่อระหว่าง **Backend (Java) -> Redis -> n8n Worker** เพื่อให้ประมวลผลงาน AI ได้อย่างลื่นไหลและประหยัดทรัพยากรสูงสุด

---

## 🧵 1. Asynchronous Job Lifecycle & Backpressure

* **Accepted Immediately:** Backend บันทึกงานลง DB และคืน **202 Accepted** ภายใน < 50ms
* **Redis Queue-Limit:** บังคับตั้งค่า `N8N_WORKERS_CONCURRENCY=2` เพื่อจำกัดภาระ CPU ไม่ให้เกิน 0.4 Core
* **Polling & SSE:** Frontend ติดตามสถานะผ่าน SSE โดยอ่านจากตาราง `ai_jobs` ใน Postgres เท่านั้น ห้าม Query ไปที่ n8n โดยตรง

---

## 📦 2. Binary-Free Flow (The S3 Law)

* **Presigned Handshake:** บังคับใช้ S3 Presigned URL (PUT) ให้ Frontend อัปโหลดไฟล์โดยตรง ไม่ผ่าน Memory ของแอป
* **URL-Only Payload:** ข้อมูลที่วิ่งในระบบต้องเป็น JSON URL เท่านั้น ห้ามส่ง Byte Array หรือ Base64 เด็ดขาด
* **Storage TTL:** บังคับตั้งค่า **Lifecycle Rule** ใน S3/R2 ให้ลบไฟล์ใน `/temp/` อัตโนมัติภายใน 24 ชม. เพื่อรักษาพื้นที่ 100GB Disk

---

## 🛠️ 3. Persistence & State Recovery

* **The Source of Truth:** Postgres คือความจริงหนึ่งเดียว n8n ต้องอัปเดตสถานะผ่าน **Secure Internal Webhook**
* **Webhook Signing:** ทุกการอัปเดตจาก n8n ต้องแนบ `X-Workflow-Secret` เพื่อป้องกันการปลอมแปลงสถานะงาน
* **The 3-Strike Rule (DLQ):** งานที่ล้มเหลวจะถูก Retry อัตโนมัติสูงสุด 3 ครั้ง หากยังไม่สำเร็จต้องตัดจบสถานะ `FAILED_PERMANENTLY`

---

## 🚀 4. AI-UX & Real-time Feedback

* **Granular Progress:** n8n ต้องส่งค่า Progress (0-100) กลับมาทุกๆ 20% ของขั้นตอนงาน
* **Aspect Ratio Metadata:** Backend ต้องส่งค่าสัดส่วนภาพ (Width/Height) ไปให้ Frontend จองพื้นที่หน้าจอทันที (No Layout Shift)
* **SSE Heartbeat:** Backend ต้องส่งสัญญาณชีพทุก 15 วินาที เพื่อป้องกัน Nginx ตัด Connection

---

## 🧹 5. Maintenance & Resource Hygiene (The Final Polish)

* **The n8n Execution Pruning Rule:** [NEW] บังคับตั้งค่า `EXECUTIONS_DATA_PRUNE=true` และ `EXECUTIONS_DATA_MAX_AGE=168` (หรือตามค่าที่กำหนดในระบบ) เพื่อจำกัดประวัติการรันไว้ที่ **100 รายการล่าสุด** เท่านั้น
* **Daily Vacuum:** บังคับรันคำสั่ง Prune History ทุกวันผ่าน Cronjob หรือ Internal Schedule ของ n8n เพื่อป้องกันฐานข้อมูล `n8n_db` บวมจนกิน RAM และ Disk I/O ของเครื่อง 8GB

---

## ⚡ Global Commandments (กฎเหล็ก AI Workflow)

1. **The S3 Handover Rule:** ห้ามส่งไฟล์ผ่าน API (URL 100%)
2. **The Concurrency Lock:** ห้ามรันงาน AI พร้อมกันเกิน 2 งาน (Max CPU 0.4)
3. **The Atomic Credit Rule:** ตัดเครดิตเฉพาะเมื่อ `COMPLETED` ภายใน Transaction เดียวกันเท่านั้น
4. **The Secret Header Rule:** Webhook ระหว่าง n8n และ Backend ต้องมี Secret Token เสมอ
5. **The Pruning Rule:** ห้ามเก็บ Execution History เกินความจำเป็น (Max 100)

---

### 🛡️ สรุปผลกระทบของการ "Pruning" (Security & Performance)

| หัวข้อ | ผลลัพธ์ต่อเครื่อง 8GB | ระดับความสำคัญ |
| --- | --- | --- |
| **Disk I/O** | ลดการเขียนประวัติที่ไม่จำเป็น ทำให้ Database ตอบสนองเร็วขึ้น | **สูงสุด** |
| **RAM Usage** | ป้องกัน Index ของ n8n_db ขนาดใหญ่เกินไปจนต้องใช้ RAM เยอะ | **สูงมาก** |
| **Recovery Rate** | เมื่อระบบล่ม การ Restart n8n จะเร็วขึ้นเพราะไม่ต้อง Load ข้อมูลเก่า | **ปานกลาง** |

---