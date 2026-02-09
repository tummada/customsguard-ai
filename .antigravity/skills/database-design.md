# 🗄️ Database Design Mastery: AI-SaaS (8GB RAM Optimized)

คัมภีร์ชุดนี้กำหนดมาตรฐานสถาปัตยกรรมฐานข้อมูล เพื่อรองรับระบบ Multi-tenant ที่เสถียรที่สุด ปลอดภัยจากการรั่วไหลของข้อมูล และประหยัดทรัพยากรระดับ Byte สำหรับเครื่อง RAM 8GB

---

## 🏛️ 1. Core Philosophy (ปรัชญาหลัก)

* **Zero-Trust Multi-tenancy:** ข้อมูลทุกแถวต้องถูกล็อกด้วย Row-Level Security (RLS) และป้องกัน Connection Pooling Leak อย่างเด็ดขาด
* **Trigger-Driven Integrity:** ใช้ PostgreSQL Triggers ในการรักษาความถูกต้องของยอดเงินข้ามตาราง (Ledger -> Balance) ภายใน Transaction เดียวกัน
* **RAM-First Indexing:** จำกัดจำนวน Index และใช้ Partial Index เพื่อรักษาพื้นที่ใน `shared_buffers` (1.5GB) ให้มีประสิทธิภาพสูงสุด

---

## 🆔 2. Identity & Data Types (ประหยัดระดับ Byte)

เลือกชนิดข้อมูลที่ใช้พื้นที่น้อยที่สุดเพื่อลดภาระ RAM และ Disk I/O:

* **Primary Key:** บังคับใช้ **UUID v7** (Time-sortable) เพื่อเพิ่มความเร็ว Sequential Write  และลด Index Fragmentation
* **Progress Tracking:** ใช้ `SMALLINT` (2 bytes) แทน `INTEGER` (4 bytes) สำหรับค่าเปอร์เซ็นต์ (0-100)
* **Timestamps:** บังคับใช้ `TIMESTAMPTZ` ทุกตารางเพื่อความแม่นยำของเวลาทั่วโลก
* **Booleans:** ใช้ `BOOLEAN` แทน String หรือ Integer เพื่อประหยัดพื้นที่จัดเก็บ

---

## 👥 3. Multi-tenancy Hardening (RLS Policy)

ป้องกันข้อมูลรั่วไหลระหว่าง Tenant ด้วยมาตรการขั้นสูง:

* **Transaction-Scoped Identity:** บังคับใช้ `SET LOCAL app.current_tenant_id` ภายใน Transaction บล็อกเท่านั้น เพื่อป้องกันค่าค้างใน Connection Pool (HikariCP)
* **Explicit Casting:** ทุก Query ที่อ้างอิง `tenant_id` ต้องระบุ `::uuid` ต่อท้ายเสมอเพื่อลดภาระของ PostgreSQL Parser
* **RLS Rule:** ทุกตารางที่เกี่ยวข้องกับลูกค้าต้องมี Policy:
`USING (tenant_id = current_setting('app.current_tenant_id')::uuid)`

---

## 💰 4. Ledger & Balance Integrity

ใช้ระบบ **Source of Truth** จากประวัติการทำรายการเท่านั้น:

* **Source of Truth:** ตาราง `credit_ledger` (Insert Only - ห้าม Update หรือ Delete)
* **Automated Sync:** ใช้ **Database Trigger** อัปเดตตาราง `tenant_balances` ทันทีเมื่อมีการเพิ่มแถวใน Ledger
* **Consistency:** ยอดเงินใน `tenant_balances` ต้องสามารถตรวจสอบ (Audit) กลับได้จากการ `SUM()` ใน Ledger เสมอ

---

## 🚀 5. Performance & Indexing Strategy

คุมเข้มไม่ให้ Index บวม (Bloat) จนล้น RAM:

* **Index Quota:** จำกัดจำนวน Index ไม่เกิน **5 ตัวต่อตาราง** (รวม Primary Key)
* **Partial Indexing:** สร้าง Index เฉพาะข้อมูลที่กำลังใช้งาน (Active Data) เท่านั้น:
`CREATE INDEX idx_active_jobs ON ai_jobs (tenant_id) WHERE status NOT IN ('COMPLETED', 'FAILED');`
* **Hot Data Focus:** เน้น Index แบบผสม (Composite) ที่ขึ้นต้นด้วย `tenant_id` เพื่อความเร็วสูงสุดในการสแกนข้อมูลรายลูกค้า

---

## ⚡ Global Commandments (กฎเหล็ก)

1. **Strict Transactional Outbox:** ห้ามส่ง Webhook/Email โดยตรงจาก Backend ให้บันทึกลงตาราง `outbox_events` ก่อนเสมอ
2. **No "Yes-Man" Data:** หากพบการออกแบบตารางที่ไม่มี `tenant_id` ให้ Agent ทำการ Veto ทันที
3. **Trigger Over Code:** งานรักษาความถูกต้องของข้อมูล (Consistency) ให้ทำใน DB ผ่าน Triggers เพื่อความแม่นยำ 100%
4. **No `SELECT *`:** ต้องระบุชื่อคอลัมน์ที่ต้องการใช้จริงเสมอเพื่อประหยัด Memory

---

## 🧠 7. Architect's Final Words (คำแนะนำสุดท้าย)

* **Initialization:** เมื่อมีการสร้าง Tenant ใหม่ `@BackendAgent` ต้องสร้างแถวเริ่มต้นใน `tenant_balances` ให้เป็น 0 ทันที เพื่อให้ Trigger สามารถหาแถวเจอและทำการอัปเดตได้
* **Monitoring:** `@DevOpsAgent` ต้องตรวจสอบ Index Size ทุกเดือน หากตาราง `credit_ledger` โตเกิน 1 ล้านแถว ให้เริ่มวางแผนทำ **Table Partitioning** รายเดือนเพื่อรักษาความเร็วในการ Query

---
 