# 🎨 Frontend Mastery: Angular 21 & Signals (Final Hardened)

คัมภีร์ชุดนี้กำหนดมาตรฐานการพัฒนาหน้าบ้านด้วย Angular 21 เพื่อมอบประสบการณ์การใช้งาน AI ที่ลื่นไหล มั่นคง และตอบสนองระดับ 60fps ภายใต้สถาปัตยกรรม Zoneless และ Signal-driven ที่สมบูรณ์แบบ

---

## 🏛️ 1. Core Stack & Architecture

* **Framework:** Angular 21 (Zoneless Mode)
* **Reactivity:** **Hybrid Strategy** (RxJS for Data Streams, Signals for UI State)
* **The Bridge Rule:** บังคับใช้ `toSignal()` และ `toObservable()` เป็นสะพานเชื่อมระหว่าง Logic ที่ซับซ้อนและ Template

---

## ⚡ 2. The Signals-First Revolution (Signal Queries)

เพื่อให้ระบบเป็น Signal-based 100% เราจะไม่ใช้ Decorator แบบเก่าอีกต่อไป:

* **Signal Queries:** บังคับใช้ **`viewChild`**, **`viewChildren`**, **`contentChild`**, และ **`contentChildren`** (Signal-based) แทน `@ViewChild` แบบเดิม
* **Benefit:** การเข้าถึง DOM Elements หรือ Child Components จะกลายเป็น Reactive โดยธรรมชาติ ช่วยลดปัญหา `undefined` ในจังหวะที่ Lifecycle ยังรันไม่ครบ

---

## 🔄 3. SSE & Error State Management

หน้าบ้านต้องมีความฉลาดในการกู้คืนการเชื่อมต่อ (Resilience):

* **Granular States:** ใน `JobStreamingService` นอกจากสถานะ `CONNECTED` และ `DISCONNECTED` ต้องมีสถานะ **`RECONNECTING`**
* **UX Feedback:** เมื่อ SSE หลุด ให้สลับสถานะเป็น `RECONNECTING` ทันทีเพื่อให้ UI แสดง Spinner หรือ Status Indicator เล็กๆ ให้ผู้ใช้อุ่นใจว่าระบบกำลังกู้คืนข้อมูล
* **Automatic Cleanup:** บังคับใช้ `DestroyRef` เพื่อปิด `EventSource` ทันทีเมื่อเลิกใช้งาน ป้องกัน Memory Leak

---

## 🎨 4. CLS Protection & Smooth UX

* **Aspect Ratio Strategy:** ใช้ CSS `aspect-ratio` โดยคำนวณจากคำสั่งที่ส่งไป เพื่อจองพื้นที่รูปภาพให้เป๊ะ 100% ป้องกัน Layout Shift
* **Progress Interpolation:** ใช้ `requestAnimationFrame` ร่วมกับ Signal เพื่อให้ ProgressBar เคลื่อนที่อย่างนุ่มนวลระดับ 60fps แม้ข้อมูลจาก Server จะมาเป็นช่วงๆ

---

## 🚀 5. Performance Configuration

| หัวข้อการตั้งค่า | แนวทางปฏิบัติ | เหตุผลเชิงเทคนิค |
| --- | --- | --- |
| **Change Detection** | **Zoneless** | `provideExperimentalZonelessChangeDetection()` ตัด Overhead ของ Zone.js |
| **Data Fetching** | **Fetch API** | `provideHttpClient(withFetch())` ประหยัด RAM กว่า XHR |
| **Lazy Loading** | **Deferrable Views** | บังคับใช้ `@defer (on viewport)` สำหรับ Component ที่มีน้ำหนักมาก |

---

## ⚡ Global Commandments (กฎเหล็กฉบับ Hardened)

1. **The Signal-Only Rule:** ห้ามใช้ `@ViewChild` หรือ `@Input` แบบเก่า ให้ใช้ **Signal-based Queries** และ **Signal Inputs** เท่านั้น
2. **The Reconnecting Rule:** เมื่อ SSE หลุด ต้องอัปเดตสถานะเป็น `RECONNECTING` และมี Reconnection Logic ที่ชัดเจน (Exponential Backoff)
3. **The Heartbeat Rule:** หากไม่ได้รับ Heartbeat จาก Backend ภายใน 30 วินาที ให้ถือว่าการเชื่อมต่อหลุดและเริ่ม Reconnect ทันที
4. **No Zone.js:** ห้ามพึ่งพาการเช็ค Change Detection แบบ Manual ทุกอย่างต้องไหลผ่าน Signals

---

> "Consistency in State, Fluidity in Motion. This is the Angular 21 way."

---