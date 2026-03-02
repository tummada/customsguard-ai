# VOLLOS - Customs Guard AI: Test Checklist

## 1. ติดตั้ง Extension

- [ ] `npm install` สำเร็จไม่มี error
- [ ] `npm run dev` รันสำเร็จ ได้โฟลเดอร์ `dist/`
- [ ] เปิด `chrome://extensions` → Developer mode → Load unpacked → เลือกโฟลเดอร์ `dist/`
- [ ] hot reload ทำงาน (แก้โค้ด → extension อัพเดตอัตโนมัติ)
- [ ] Extension โหลดขึ้นมาไม่มี error ใน Service Worker console
- [ ] ไอคอนแสดงบน toolbar ถูกต้อง (16px, 48px, 128px)

## 2. Side Panel UI

- [ ] คลิกไอคอน Extension → Side Panel เปิดขึ้นมา
- [ ] แท็บ "Magic Fill" และ "Scan" แสดงผลถูกต้อง
- [ ] สลับแท็บไปมาได้ปกติ
- [ ] UI แสดง dark theme (gray-950) ถูกต้อง
- [ ] Responsive ใช้งานได้ใน panel ที่แคบ

## 3. ตั้งค่า Gemini API Key

- [ ] คลิกปุ่ม Settings → Dialog เปิดขึ้น
- [ ] ใส่ Gemini API Key → บันทึกสำเร็จ
- [ ] API Key เก็บใน `chrome.storage.local` (ตรวจผ่าน DevTools > Application > Storage)
- [ ] ช่อง input เป็น type password ไม่โชว์ key
- [ ] ปิดแล้วเปิดใหม่ key ยังอยู่

## 4. PDF Upload & Scan

- [ ] ลาก PDF ไฟล์มาวางใน Drop Zone ได้
- [ ] คลิกเลือกไฟล์ PDF ได้
- [ ] PDF render แสดงตัวอย่างหน้าเอกสาร
- [ ] กดปุ่ม Scan → ส่งไป Gemini API สำเร็จ
- [ ] แสดง loading state ระหว่างรอ AI ประมวลผล
- [ ] ทดสอบ PDF หลายหน้า (multi-page)
- [ ] ทดสอบ PDF ที่ไม่ใช่เอกสารศุลกากร → แสดงผลเหมาะสม
- [ ] ทดสอบกรณีไม่มี API Key → แสดง error ชัดเจน
- [ ] ทดสอบ API Key ผิด → แสดง error ชัดเจน

## 5. AI Extraction & Traffic Light

- [ ] ข้อมูลที่ AI สกัดแสดงในตาราง Line Items
- [ ] Traffic Light สีถูกต้อง:
  - **Gold** (>90%): confidence สูง
  - **Orange** (60-90%): confidence กลาง
  - **Red** (<60%): confidence ต่ำ พร้อมคำอธิบาย
- [ ] Hover ที่ Traffic Light แสดง % confidence และเหตุผล
- [ ] ข้อมูลที่สกัดได้ครบ: HS code, คำอธิบาย, จำนวน, น้ำหนัก, ราคา, CIF, สกุลเงิน

## 6. แก้ไข Line Items

- [ ] คลิกที่ cell → เข้า edit mode
- [ ] แก้ไขค่า → กด Enter → บันทึกสำเร็จ
- [ ] กด Escape → ยกเลิกการแก้ไข
- [ ] item ที่แก้ไขแล้วเปลี่ยนเป็นสี **Blue**
- [ ] item ที่ confirm แล้วล็อค ไม่ให้แก้ไขอีก
- [ ] ปุ่ม Confirm ทีละ item ใช้งานได้
- [ ] ปุ่ม Bulk Confirm (confirm Gold ทั้งหมด) ใช้งานได้

## 7. Magic Fill (กรอกฟอร์มอัตโนมัติ)

- [ ] เปิดเว็บ customs.go.th ที่มีฟอร์มใบขน
- [ ] กดปุ่ม Fill → ข้อมูลลงฟอร์มถูกต้อง
- [ ] ตรวจสอบ field matching:
  - HS code ลงช่องพิกัด
  - คำอธิบายลงช่องรายการสินค้า
  - จำนวน/น้ำหนัก/ราคา ลงช่องที่ถูกต้อง
- [ ] ตัวเลขแสดงทศนิยม 2 ตำแหน่ง (Big.js precision)
- [ ] ฟอร์มใน iFrame กรอกได้ (cross-origin messaging)
- [ ] ทดสอบกับเว็บอื่นที่ไม่ใช่ customs.go.th → ไม่ทำงาน (origin validation)

## 8. IndexedDB (Dexie)

- [ ] DevTools > Application > IndexedDB → ดู database ถูกสร้าง
- [ ] ตาราง `cgDeclarations` มีข้อมูล declaration
- [ ] ตาราง `cgDeclarationItems` มีข้อมูล line items
- [ ] ตาราง `cgAuditLogs` บันทึก audit trail ทุก action
- [ ] ปิดแล้วเปิด extension ใหม่ → ข้อมูลยังอยู่

## 9. Error Handling

- [ ] ไม่มี internet → แสดง error เมื่อ scan
- [ ] PDF ไฟล์เสีย/ไม่ใช่ PDF → แสดง error
- [ ] Gemini API rate limit → แสดง error ชัดเจน
- [ ] ตรวจ console ไม่มี uncaught errors ระหว่างใช้งานปกติ

## 10. Security

- [ ] API Key ไม่โผล่ใน console log
- [ ] API Key ไม่ถูกส่งผ่าน message (ใช้ storage เท่านั้น)
- [ ] cross-origin message ตรวจ origin ถูกต้อง (customs.go.th เท่านั้น)
- [ ] ไม่มี sensitive data ใน source code ที่ commit

## วิธี Debug

```bash
# Dev mode (ใช้ตัวนี้ ได้ hot reload + load unpacked ได้เลย)
npm run dev

# Build production (สำหรับ pack เป็น .crx / .zip เท่านั้น)
npm run build

# ดู Service Worker logs
chrome://extensions → คลิก "Service Worker" link

# ดู Side Panel logs
Right-click Side Panel → Inspect

# ดู Content Script logs
F12 บนหน้าเว็บ customs.go.th → Console tab

# ดู IndexedDB
F12 → Application → IndexedDB
```
