# TODO: Data Pipeline — งานที่ยังเหลือ

## 1. FTA Rates (สำคัญมาก — ข้อมูลหลักที่ยังขาด)

**ปัญหา:** เว็บ thailandntr.com ใช้ Vue.js render ฝั่ง client → scrape จาก server ไม่ได้

**แผน:** สร้าง Chrome Extension ตัวเล็ก
- User เปิด NTR ในบราวเซอร์ที่ไทย
- Extension อ่านข้อมูล FTA rates จากหน้าเว็บ
- ส่งขึ้น DB อัตโนมัติ
- ข้อมูลถูกต้อง 100% เพราะมาจากแหล่งจริง
- ต้องทำ: 10 FTA agreements × 97 chapters

**วิธีเริ่ม:** บอก Claude "ทำ Chrome Extension สำหรับ scrape FTA rates จาก NTR"

## 2. Scheduled Jobs (สำคัญ — ข้อมูลเก่า = คำตอบผิด)

ต้องสร้าง scheduled job อัปเดตข้อมูลอัตโนมัติ:

| ข้อมูล | ความถี่ | แหล่ง |
|--------|---------|-------|
| FTA Rates | ปีละ 1 ครั้ง (ต้นปี) | NTR / แหล่งทางการ |
| กฎระเบียบศุลกากร | ทุก 1-3 เดือน | ecs-support, customs.go.th |
| อัตราภาษี MFN | ปีละ 1 ครั้ง | พ.ร.ก. ศุลกากร |
| Anti-dumping/CVD | ทุกเดือน | dft.go.th |
| HS Codes | ทุก 5 ปี | data.go.th (WCO revision) |
| BOI/Excise/สมอ./อย. | ทุก 3 เดือน | เว็บหน่วยงาน |

**วิธีเริ่ม:** บอก Claude "สร้าง scheduled job สำหรับอัปเดตข้อมูลศุลกากร"

## 3. ปิด VM + Cloud SQL ✅ (ทำแล้ว / ยังไม่ทำ)

Data dump มา local แล้ว (67.8 MB) → ปิดได้เลย ดูคำสั่งด้านล่าง
