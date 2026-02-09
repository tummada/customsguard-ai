# ☕ Backend Mastery: Java Spring Boot 3.5 (Hardened v1.3)

คัมภีร์ชุดนี้กำหนดมาตรฐานการพัฒนา Java Backend สำหรับ AI-SaaS โดยเน้นประสิทธิภาพสูงสุดด้วย Java 21 Virtual Threads และความปลอดภัยระดับ Zero-Trust บนทรัพยากรที่จำกัด

---

## 🏛️ 1. Core Stack & Performance Tuning

เพื่อให้ระบบ "Lean & Mean" บน **RAM 1GB** เราจะใช้การตั้งค่าระดับ Battle-Hardened ดังนี้:

| หัวข้อการตั้งค่า | แนวทางปฏิบัติ | เหตุผลเชิงเทคนิค |
| --- | --- | --- |
| **Framework** | **Spring Boot 3.5+** | ใช้ฟีเจอร์ Native Support และการจัดการ Virtual Threads ขั้นสูง |
| **Runtime** | **Java 21 / GraalVM** | เน้นการทำ Native Image เพื่อลด Memory Footprint (Heap 512M) |
| **Garbage Collector** | **Serial GC** | สำหรับ RAM < 2GB Serial GC ประหยัด RAM และลด CPU Overhead |
| **JSON Library** | **Jackson (Blackbird)** | ใช้ `jackson-module-blackbird` เพื่อเสถียรภาพสูงสุดบน Java 21 |
| **DB Pool** | **HikariCP (Max 15)** | บังคับเปิด `leakDetectionThreshold` เพื่อตรวจหา "Thread ผีดิบ" |
| **Observability** | **NMT (Summary)** | [NEW] รันด้วย `-XX:NativeMemoryTracking=summary` ใน Staging |

---

## 🧵 2. Virtual Threads & The "Pinned" Rule

* **The Anti-Pinning Rule:** ห้ามใช้บล็อก `synchronized` ในจุดที่ทำ I/O บังคับใช้ **`ReentrantLock`** แทนเท่านั้น เพื่อป้องกัน Virtual Thread ถูกล็อกติดกับ Platform Thread
* **Debugging:** เปิด Flag `-Djdk.tracePinnedThreads=full` ใน Dev Mode เสมอเพื่อตรวจสอบความผิดปกติ

---

## 🛡️ 3. RLS & Transaction Synchronization

* **Automatic Injection:** ใช้ `StatementInspector` หรือ DataSource wrapper ฉีด `SET LOCAL app.current_tenant_id` เข้าไปในทุก SQL Query
* **Strict Scope:** การตั้งค่า Tenant ID ต้องเกิดขึ้นภายใน Transaction เดียวกันเสมอเพื่อให้คำสั่ง `LOCAL` ทำงานได้ถูกต้อง

---

## ⚙️ 4. Native Image & ID Strategy

* **The Sequential Write Rule:** ห้ามใช้ `GenerationType.AUTO` บังคับสร้าง **UUID v7** จาก Application Layer เพื่อประสิทธิภาพสูงสุดของ B-Tree Index
* **Reflection Registry:** บังคับใช้ **`RuntimeHintsRegistrar`** สำหรับ Library ภายนอกที่ใช้ Reflection เพื่อให้ GraalVM รู้จักตั้งแต่ตอน Build

---

## 🚀 5. API & Async Orchestration

* **Async-First:** คืน `202 Accepted` พร้อม Job ID ทันทีสำหรับงาน AI ที่ใช้เวลานาน
* **Graceful Shutdown:** ตั้งค่า `spring.lifecycle.timeout-per-shutdown-phase=20s` เพื่อให้ Virtual Threads เคลียร์งานค้างให้เสร็จก่อนถูก Kill

---

## ⚡ Global Commandments (กฎเหล็กฉบับสมบูรณ์)

1. **The Blackbird Rule:** บังคับใช้ `jackson-module-blackbird` เพื่อความเร็วและเสถียรภาพบน Java 21
2. **The Leak-Detector Rule:** บังคับเปิด `leakDetectionThreshold` ใน HikariCP เพื่อตรวจหาจุดที่ลืมคืน Connection
3. **The Sequential Write Rule:** บังคับใช้ UUID v7 ที่สร้างจาก Application เพื่อถนอม Index ของ Postgres
4. **The "Pinned" Rule:** ห้ามใช้ `synchronized` ใน Service Layer บังคับใช้ `ReentrantLock` เท่านั้น
5. **Shadow Build Requirement:** ต้องทดสอบ Integration Test บน **Native Binary** อย่างน้อย 1 ครั้งก่อน Merge
6. **The NMT Rule:** [NEW] บังคับรันด้วย `-XX:NativeMemoryTracking=summary` ใน Staging เพื่อวิเคราะห์การใช้ RAM (Heap vs Metaspace vs Stack) ก่อนกำหนดค่าขีดจำกัดสูงสุดใน Production

---

> "Virtual Threads are our speed, Native Image is our constraint, and Discipline is our stability."

--- 