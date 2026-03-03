# Feature Status Cheat Sheet — สิ่งที่ระบบทำได้จริง vs กำลังพัฒนา

---

## ทำได้แล้ว (Demo ได้เลย)

| ฟีเจอร์ | สถานะ | หมายเหตุ |
|---|---|---|
| สแกน PDF → ดึงรายการสินค้า | ✅ ทำได้ | PDFBox + Gemini Vision OCR |
| ไฟสัญญาณความมั่นใจ (เขียว/เหลือง/แดง) | ✅ ทำได้ | TrafficLight component |
| ค้น HS Code ด้วย semantic search | ✅ ทำได้ | pgvector + Gemini embedding |
| เตือน FTA + คำนวณเงินประหยัดเป็นบาท | ✅ ทำได้ | ATIGA, JTEPA, TAFTA ฯลฯ |
| แก้ไข + ยืนยันรายการ (Human-in-the-loop) | ✅ ทำได้ | Editable table in Extension |
| Auto-Save Draft (กันงานหาย) | ✅ ทำได้ | Dexie/IndexedDB ในเครื่อง |
| JWT Auth + Data Isolation | ✅ ทำได้ | Multi-tenant RLS + HTTPS |

---

## กำลังพัฒนา (พูดได้ แต่ยังไม่ demo)

| ฟีเจอร์ | สถานะ | หมายเหตุ |
|---|---|---|
| ถาม-ตอบกฎระเบียบ (RAG Chat) | 🔨 Phase 2 | หลัง data pipeline เสร็จ |
| ฐานข้อมูล HS Code ครบ 12,000 รายการ | 🔨 Data Pipeline | กำลังดึงข้อมูล |
| ประกาศกรมฯ 500+ ฉบับ | 🔨 Data Pipeline | กำลังดึงข้อมูล |
| Anti-dumping / Excise alerts | 🔨 Tier 2 | อยู่ใน roadmap |
| BOI privilege lookup | 🔨 Tier 2 | อยู่ใน roadmap |

---

## Feature ใหม่ที่จะ Validate กับชิปปิ้ง

| ฟีเจอร์ | ทำไมสำคัญ | ถามชิปปิ้งว่า... |
|---|---|---|
| XML/EDI Export (Import เข้า Netbay/TIFFA) | ทางรอดถ้าลง Extension ไม่ได้ | "ถ้าเจน XML ให้ Import ได้ สนใจมั้ย?" |
| GRI Rule อ้างอิง (Rule 1, 3a ฯลฯ) | สร้างความเชื่อมั่นระดับมืออาชีพ | "ถ้าบอก GRI ด้วย จะช่วยมั้ย?" |
| Audit Trail (log อ้างอิงเอกสาร) | ป้องกัน Post-Audit | "ถ้ามี log อ้างอิง จะช่วยตอนโดนตรวจมั้ย?" |
| เรทแลกเปลี่ยนกรมศุลฯ อัตโนมัติ | ป้องกัน Amendment จากเรทผิด | "เคยใช้เรทผิดมั้ย?" |
| Approve/Review workflow | อาวุโสตรวจงานจูเนียร์ | "พนักงาน vs อาวุโส ตรวจกันยังไง?" |
| Auto-Save + Offline Draft | กัน iFrame ค้าง/งานหาย | "e-Customs ค้างบ่อยมั้ย?" |

---

## ข้อควรระวังในการ Demo

### ห้ามพูด:
- ❌ "ระบบทำแทนได้" → ✅ "ระบบช่วยเตรียม draft ให้"
- ❌ "100% ถูกต้อง" → ✅ "ไฟเขียว = มั่นใจสูง แต่ตัดสินใจสุดท้ายอยู่ที่พี่"
- ❌ ดูถูกวิธีเดิม → ✅ "ผมรู้ว่าพี่ทำงานได้ดีอยู่แล้ว แค่อยากช่วยให้เร็วขึ้น"
- ❌ สัญญาว่าทำได้ → ✅ "ผมจดไว้ครับ จะกลับไปดูว่าทำได้มั้ย"

### ถ้า Demo พัง:
- สลับไปดู **screenshot backup** ที่เตรียมไว้
- พูดว่า "ขออภัยครับ internet ช้านิด ดูจากภาพนี้ก่อนนะครับ"
- อย่าพยายามแก้ bug สด ให้ข้ามไปฟีเจอร์ถัดไป
