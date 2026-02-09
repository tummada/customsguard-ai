# 🏗️ Infrastructure & DevOps Mastery: AI-SaaS (Final Hardened)

คัมภีร์ชุดนี้คือกฎอัยการศึกด้านโครงสร้างพื้นฐาน เพื่อควบคุมให้ระบบ AI-SaaS รันได้อย่างเสถียรบนทรัพยากรที่จำกัด (2 CPU / 8GB RAM) ด้วยมาตรฐานระดับสูง

---

## 🏛️ 1. Core Philosophy (ปรัชญาหลัก)

* **Resource-First Stability:** ทุก Service ต้องถูกจำกัดทรัพยากร (Hard Limit) เพื่อป้องกัน CPU/RAM Starvation
* **Zero-Downtime Resilience:** ใช้ระบบ Health Checks และ Self-healing (`restart: unless-stopped`) เพื่อความต่อเนื่องของธุรกิจ
* **Binary-Free & Stateless:** ห้ามเขียนไฟล์ลง Container filesystem (ยกเว้น `/tmp`) ข้อมูลถาวรทั้งหมดต้องไปที่ S3 หรือ Database เท่านั้น

---

## 📊 2. Resource Allocation Matrix (ฉบับ Final Hardened)

| Service | CPU Limit | RAM Limit | OOM Score | High-Availability Logic |
| --- | --- | --- | --- | --- |
| **PostgreSQL** | 0.4 | 1.5 GB | -500 | `ulimits 65536`, `shm_size 1GB` |
| **Redis** | 0.2 | 512 MB | -500 | `allkeys-lru`, `requirepass` |
| **Java Backend** | 0.6 | 1.0 GB | 0 | **Native Image Only** (Heap 512M) |
| **n8n Total** | 0.5 | 2.0 GB | 500 | Worker Mode (Queue via Redis) |
| **Nginx Proxy** | 0.1 | 256 MB | -1000 | `worker_processes 1`, Buffering OFF |
| **System Reserve** | **0.2** | **~2.7 GB** | N/A | Host OS & Swap Management |

---

## 🛡️ 3. OS & Disk Hardening

* **The Swap Strategy:** เนื่องจาก RAM มีจำกัด ต้องสร้าง Swap File ขนาด 4-8GB บน Disk 100GB และตั้งค่า `vm.swappiness=10` เพื่อเป็นเบาะรองรับจังหวะ Spike
* **OOM Protection:** ตั้ง Nginx ไว้ที่ -1000 (ประตูหน้าห้ามตาย) และ DB/Redis ที่ -500
* **Pruning Policy:** ป้องกัน Disk 100GB เต็มด้วยการตั้ง Cron Job รัน `docker system prune -af --volumes` ทุกอาทิตย์เพื่อเคลียร์ Artifacts และ Images เก่า
* **Logging:** บังคับใช้ `json-file` พร้อม `max-size: 10m` และ `max-file: 3` ทุก Service

---

## 🚀 4. Shadow Build Strategy (Deployment Rule)

**"ห้าม Build Native Image บนเครื่อง Production เด็ดขาด"**

* การคอมไพล์ GraalVM ใช้ RAM มหาศาล (> 4-6GB) ซึ่งจะทำให้ Service อื่นล่ม
* **Standard:** @DevOpsAgent ต้องใช้ CI/CD ภายนอก (เช่น GitHub Actions) ในการ Build Binary แล้วส่งเฉพาะ Artifact ที่คอมไพล์เสร็จแล้วมา Deploy เท่านั้น

---

## 🏥 5. Backup & The Restoration Rule

* **Automated Backup:** สั่ง SQL Dump ขึ้น S3 ทุกวัน
* **The Restoration Rule:** ต้องมีการสุ่มทดสอบ Restore ข้อมูลจาก Backup ทุกเดือน เพื่อยืนยันว่าไฟล์ Backup ไม่ใช่ "Zombie Backup" (มีไฟล์แต่ใช้ไม่ได้)

---

## ⚡ Global Commandments (กฎเหล็กฉบับสมบูรณ์)

1. **The 1.9 Rule:** ยอดรวม CPU Quota ต้องไม่เกิน  เพื่อให้ Host OS มี "ลมหายใจ" ในการจัดการ I/O และ Interrupts
2. **Self-Healing:** ทุก Service ต้องมี Health Check ที่ตรวจสอบ Network Connectivity จริง และตั้งค่า `restart: unless-stopped`
3. **Stateless Logic:** ห้ามเก็บ Binary ในเครื่องเด็ดขาด เพื่อรักษา Disk IOPS สำหรับ Database เท่านั้น
4. **The Postman Rule:** Nginx ทำหน้าที่คัดกรองความปลอดภัยเบื้องต้น (CORS/Payload 10M) แต่ห้ามยุ่งกับ Business Logic

---

> "Stability is the foundation of scale. On 8GB, discipline is our only insurance."

---
