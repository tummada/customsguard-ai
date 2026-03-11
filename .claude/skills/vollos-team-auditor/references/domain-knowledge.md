# Domain Knowledge — Thai Customs & Import/Export

ฐานความรู้ด้าน domain ศุลกากรไทยสำหรับ vollos-code-auditor
**อ่านก่อนเริ่ม audit ทุกครั้ง** — ใช้เป็น reference ตรวจ Domain Compliance (STEP 5)

---

## 1. อัตราแลกเปลี่ยนศุลกากร

### แหล่งข้อมูลที่ถูกต้อง
- **ต้องใช้:** อัตราแลกเปลี่ยนนำเข้าจาก **กรมศุลกากร** (customs.go.th)
- **ห้ามใช้:** อัตราจาก BOT (ธนาคารแห่งประเทศไทย), ธนาคารพาณิชย์, Google, XE

### ทำไมถึงแตกต่าง
- BOT ประกาศ "อัตรากลาง (Mid Rate)" สำหรับธุรกรรมทั่วไป
- กรมศุลกากรประกาศ "อัตราศุลกากร" สำหรับคำนวณอากรโดยเฉพาะ
- **ส่วนต่าง 5-10%** เช่น USD: BOT 34.10 vs Customs 31.33 (ผิด 9%)

### อัตราขาเข้า vs ขาออก (สำคัญมาก)
- กรมศุลกากรประกาศ **2 อัตรา** สำหรับแต่ละสกุลเงิน:
  - **อัตรานำเข้า (Import Rate)**: ใช้คำนวณอากรขาเข้า (มักสูงกว่า)
  - **อัตราส่งออก (Export Rate)**: ใช้คำนวณมูลค่าสินค้าขาออก (มักต่ำกว่า)
- **ห้ามใช้อัตราเดียวกันทั้งขาเข้าและขาออก** → ถ้าระบบมี rate เดียว = CRITICAL
- ตรวจ ExchangeRateEntity: ต้องมี field แยก importRate/exportRate หรือ rateType

### ความถี่ในการอัปเดต
- กรมศุลกากรประกาศอัตราใหม่ **ทุกสัปดาห์** (วันศุกร์ มีผลวันจันทร์ถัดไป)
- ระบบต้อง auto-sync ไม่ใช่ hardcode seed data

### สิ่งที่ต้องตรวจ
```
GREP: customs.go.th, bot.or.th, exchange_rate, exchangeRate, อัตราแลกเปลี่ยน
CHECK:
- URL ที่ fetch อัตราแลกเปลี่ยน → ต้องเป็น customs.go.th
- มี @Scheduled หรือ cron job สำหรับ auto-sync หรือไม่
- ถ้าเป็น static seed data → FLAG เป็น CRITICAL
- ถ้าใช้ BOT/ธนาคาร → FLAG เป็น CRITICAL
```

---

## 2. การคำนวณอากรนำเข้า

### สูตรพื้นฐาน
```
CIF = Cost (ราคาสินค้า) + Insurance (ประกันภัย) + Freight (ค่าขนส่ง)

Import Duty = CIF × Duty Rate (%)
           หรือ CIF × Specific Duty Rate (บาท/หน่วย)  ← เลือกอันที่สูงกว่า

VAT = (CIF + Import Duty) × 7%
Excise Tax = ถ้ามี (สุรา, บุหรี่, น้ำมัน, รถยนต์)

Total Tax = Import Duty + VAT + Excise Tax (ถ้ามี)
```

### สิ่งที่ต้องตรวจ
```
GREP: vat, VAT, duty, tax, cif, CIF, excise, total_tax, totalTax
CHECK:
- คำนวณ VAT 7% หรือไม่ → ถ้าไม่ = CRITICAL
- VAT คิดจาก (CIF + Duty) ไม่ใช่แค่ CIF → ถ้าผิดสูตร = CRITICAL
- แสดง total ให้ user เห็นหรือไม่ → ถ้าไม่ = HIGH
- CIF รวม Insurance + Freight หรือไม่ → ถ้าไม่ = HIGH
- มี Excise Tax logic สำหรับสินค้าพิเศษหรือไม่ → MEDIUM (ถ้ายังไม่ support)
```

### Specific Duty vs Ad Valorem
- **Ad Valorem:** คิดเป็น % ของ CIF (เช่น 5%, 10%, 30%)
- **Specific Duty:** คิดเป็น บาท/หน่วย (เช่น 1.50 บาท/กก.)
- **กฎ:** ใช้อันที่สูงกว่า (ตาม พ.ร.บ.ศุลกากร)
- ส่วนใหญ่ระบบ CustomsGuard ใช้ ad valorem ก่อน → MEDIUM ถ้ายังไม่รองรับ specific

---

## 3. De Minimis — ยกเลิกแล้ว (2026)

### กฎเดิม (ก่อน 1 ม.ค. 2026)
- สินค้านำเข้า CIF ≤ 1,500 บาท ยกเว้นอากร + VAT
- ใช้กับพัสดุทางไปรษณีย์/ขนส่งด่วน

### กฎใหม่ (ตั้งแต่ 1 ม.ค. 2026)
- **ยกเลิก De Minimis ทั้งหมด**
- สินค้าทุกรายการ ตั้งแต่ 1 บาท ต้องจ่ายอากร + VAT
- อ้างอิง: ประกาศกรมศุลกากร / DHL FAQ

### สิ่งที่ต้องตรวจ
```
GREP: de_minimis, deMinimis, 1500, exempt, ยกเว้น, threshold
CHECK:
- ถ้า code ยังมี logic ยกเว้น ≤1,500 → FLAG เป็น CRITICAL (กฎเปลี่ยนแล้ว)
- ถ้ามี threshold ใดๆ สำหรับยกเว้นอากร → ตรวจว่ายัง valid ตามกฎปัจจุบัน
```

---

## 4. HS Code (AHTN 2022)

### รูปแบบที่ถูกต้อง
- **6 หลัก (ระดับสากล):** DDDD.DD เช่น 0306.17
- **8 หลัก (ระดับ ASEAN):** DDDD.DD.DD เช่น 0306.17.10
- **10 หลัก (ระดับประเทศ):** DDDD.DD.DD.DD เช่น 0306.17.10.00
- **ไม่ใช่:** "030617", "ABC", "9999", "test"

### Validation Rules
```
Pattern: ^\d{4}\.\d{2}(\.\d{2}){0,2}$
Examples:
  ✅ 0306.17
  ✅ 0306.17.10
  ✅ 0306.17.10.00
  ❌ 030617 (ไม่มีจุด)
  ❌ 0306 (แค่ 4 หลัก)
  ❌ ABC (ไม่ใช่ตัวเลข)
  ❌ 9999 (ไม่มีจุด ไม่ครบหลัก)
```

### LPI (สินค้าควบคุม) Prefix
- License/Permit/Import regulation ใช้ **Chapter level (4 หลัก)**
- เช่น: Chapter 03 = สัตว์น้ำ (ต้องขอ กรมประมง)
- **ห้ามปน:** "030617" (6 หลัก) กับ "0306" (4 หลัก) → normalize เป็น 4 หลักเสมอ

### สิ่งที่ต้องตรวจ
```
GREP: hsCode, hs_code, HS.Code, tariff_code, isValidHsCode, validateHs
CHECK:
- มี format validation ไหม (frontend + backend)
- LPI prefix ใช้ 4 หลักหรือปนกัน
- Seed data / migration: HS code format consistent ไหม
- ถ้ารับค่าอะไรก็ได้โดยไม่ validate → HIGH
```

---

## 5. FTA Form Names

### ชื่อที่ถูกต้อง (ตามประกาศกรมศุลกากร)

| FTA Agreement | Form Name ที่ถูกต้อง | ชื่อที่มักเข้าใจผิด |
|---------------|---------------------|-------------------|
| ATIGA (ASEAN) | Form D | |
| ACFTA (China) | Form E | |
| AKFTA (Korea) | Form AK | |
| JTEPA (Japan) | Form JTEPA | Form JT, Form JP |
| TAFTA (Australia) | **Form FTA** | Form AAT, Form TAFTA, Form TAL ❌ |
| TNZCEP (New Zealand) | Form TNZCEP | |
| TIPFA (India) | Form FTA Thai-India | |
| RCEP | Form RCEP | |

### แหล่งอ้างอิง
- ecs-support.github.io (คู่มือระบบ e-Customs)
- ประกาศกรมศุลกากร เรื่อง FTA

### สิ่งที่ต้องตรวจ
```
GREP: form, fta, tafta, acfta, jtepa, akfta, atiga, rcep, Form D, Form E
CHECK:
- ชื่อ form ใน seed data / migration / pipeline ตรงกับตารางด้านบนหรือไม่
- ถ้าชื่อผิดแม้แต่ตัวเดียว → CRITICAL (ลูกค้ายื่นผิด → โดนเรียกอากรเต็ม + ปรับ 4 เท่า)
- ตรวจทั้ง: DB seed, Python pipeline scripts, RAG text chunks
```

---

## 6. ประเภทใบขนสินค้า

### ประเภทตามกฎหมาย
| ประเภท | ภาษาอังกฤษ | ใบขน |
|-------|-----------|------|
| ขาเข้า | IMPORT | ใบขนสินค้าขาเข้า |
| ขาออก | EXPORT | ใบขนสินค้าขาออก |
| ผ่านแดน | TRANSIT | ใบขนสินค้าผ่านแดน |
| ถ่ายลำ | TRANSSHIPMENT | ใบขนสินค้าถ่ายลำ |

### สิ่งที่ต้องตรวจ
```
GREP: IMPORT, EXPORT, TRANSIT, TRANSSHIPMENT, declarationType, declaration_type
CHECK:
- Backend enum/validation รองรับทั้ง 4 ประเภทหรือไม่
- Frontend dropdown/radio มีทั้ง 4 ตัวเลือกหรือไม่
- Frontend ↔ Backend ตรงกันหรือไม่
- ถ้า Backend มี 4 แต่ UI มีแค่ 2 → HIGH (parity ไม่ตรง)
```

---

## 7. หน่วยน้ำหนักและปริมาณ

### กฎบังคับ
- **พ.ร.บ.ศุลกากร มาตรา 51:** น้ำหนักต้องเป็น กิโลกรัม (KG)
- ระบบ e-Customs ของกรมฯ รับเฉพาะ KG
- หน่วยอื่น (LB, OZ, boxes, bags) ต้อง convert เป็น KG ก่อน

### สิ่งที่ต้องตรวจ
```
GREP: weight, kg, kilogram, unit, น้ำหนัก, netWeight, grossWeight
CHECK:
- Input field บังคับหน่วย KG หรือรับ free text
- มี unit conversion logic ไหม (LB→KG, OZ→KG)
- มี dropdown เลือกหน่วยไหม
- ถ้ารับ free text (เช่น "500 boxes") → HIGH
```

---

## 8. Frontend-Backend Parity

### จุดที่ต้องเปรียบเทียบ
| สิ่งที่ตรวจ | Backend (Java) | Frontend (React/TS) |
|-----------|---------------|-------------------|
| Declaration types | enum/validation | dropdown/radio options |
| HS Code format | @Pattern / validation | isValidHsCode() |
| Weight unit | DB column type | input field constraints |
| FTA form names | seed data / DB | dropdown options |
| Currency list | exchange rate entity | currency selector |
| Error messages | exception messages | UI error text |

### สิ่งที่ต้องตรวจ
```
CHECK:
- หา enum/const ใน Backend → เทียบกับ type/const ใน Frontend
- validation rules ตรงกันทั้ง 2 ฝั่งไหม
- ถ้า Backend รองรับแต่ Frontend ไม่มี → HIGH (feature ใช้ไม่ได้)
- ถ้า Frontend มีแต่ Backend ไม่ validate → HIGH (bypass ได้)
```

---

## 9. Data Freshness & Auto-Sync

### ข้อมูลที่ต้อง auto-sync
| ข้อมูล | ความถี่ | แหล่ง |
|-------|--------|------|
| อัตราแลกเปลี่ยน | ทุกสัปดาห์ (ศุกร์) | customs.go.th |
| อัตรา FTA | เมื่อมีการเปลี่ยนแปลง | customs.go.th / ecs-support |
| LPI list | เมื่อมีการเปลี่ยนแปลง | กรมที่เกี่ยวข้อง |

### สิ่งที่ต้องตรวจ
```
GREP: @Scheduled, cron, sync, fetch, auto, schedule, scheduler
CHECK:
- มี scheduled task สำหรับ sync ข้อมูลหรือไม่
- ถ้าข้อมูลเป็น static seed เท่านั้น → CRITICAL
- มี admin endpoint สำหรับ manual trigger sync ไหม (เป็น backup)
- มี last_updated / synced_at field ที่แสดงให้ user เห็นไหม
```

---

## 10. บทลงโทษ (สำหรับอ้างอิงใน audit report)

| ความผิด | โทษ | มาตราอ้างอิง |
|--------|-----|------------|
| สำแดงราคาต่ำกว่าจริง | ปรับ 4 เท่าของอากรที่ขาด | พ.ร.บ.ศุลกากร ม.27 |
| ยื่น FTA Form ผิด | เรียกอากรเต็ม + ปรับ | ประกาศกรมฯ |
| HS Code ผิด | ปรับตามส่วนต่างอากร | พ.ร.บ.ศุลกากร ม.27 |
| ไม่ขอใบอนุญาต (LPI) | ยึดสินค้า + ปรับ | พ.ร.บ.ที่เกี่ยวข้อง |
| น้ำหนักผิดหน่วย | ปฏิเสธใบขน → ของติดท่า | พ.ร.บ.ศุลกากร ม.51 |

> ใช้ข้อมูลบทลงโทษนี้อ้างอิงใน audit findings เพื่อให้ developer เข้าใจว่าทำไม severity ถึงเป็น CRITICAL

---

## แหล่งอ้างอิงหลัก

- กรมศุลกากร: customs.go.th
- ระบบ e-Customs: ecs-support.github.io
- พ.ร.บ.ศุลกากร พ.ศ.2560
- ASEAN Harmonized Tariff Nomenclature (AHTN) 2022
- ประกาศกรมศุลกากร เรื่อง FTA
- DHL FAQ: Import duty collection for goods from 1 baht (2026)
