# 🚀 AI-SaaS World-Class

> **"Efficiency is the highest form of Beauty."** > แพลตฟอร์มให้บริการ AI ในรูปแบบ Multi-tenant SaaS ที่ออกแบบมาให้ "แรง" บนสเปกจำกัด (8GB RAM) และ "พร้อมขยาย" อย่างไร้ขีดจำกัด

---

## 🏗️ Architecture & Tech Stack

โปรเจกต์นี้ถูกสร้างขึ้นด้วยสถาปัตยกรรม **Modular Monolith** ที่พร้อมแยกเป็น Microservices ได้ทันที และใช้เทคโนโลยีระดับ Cutting-edge:

* **Frontend:** `Angular 21` (Zoneless, Signals) + `Tailwind CSS` — เน้นความเร็วระดับ 100/100 Lighthouse score
* **Core Backend:** `Java 21` + `Spring Boot 3.5` — รันบน **GraalVM Native Image** เพื่อรีด RAM ให้เหลือน้อยที่สุด
* **AI Orchestration:** `n8n` (Queue Mode) + `Redis (AOF)` — เชื่อมต่อไปยัง `ComfyUI` บน External GPU (RunPod)
* **Database:** `PostgreSQL 16` — บังคับใช้ **UUID v7** และ **Row Level Security (RLS)** เพื่อแยกข้อมูลลูกค้า
* **Infrastructure:** `Docker Compose` บน Ubuntu — จำกัด RAM อย่างเข้มงวดด้วย Resource Limits

---

## ✨ Key Features

* 👥 **Strict Multi-tenancy:** แยกข้อมูลลูกค้าขาดจากกันในระดับฐานข้อมูล ปลอดภัยสูงสุด
* ⚡ **Async AI Pipeline:** ระบบสร้างรูปภาพและวิดีโอแบบไม่บล็อกการทำงานหลัก (Fire & Forget)
* 💳 **Secure Monetization:** เชื่อมต่อ Stripe พร้อมระบบ **Transactional Outbox** ป้องกันการทำรายการพลาดเมื่อเครื่อง Lag
* 📉 **Ultra-low Footprint:** ออกแบบมาเพื่อรันทั้งระบบ (DB, Backend, Frontend, AI Bridge) ภายใน **RAM 8GB**
* 🛡️ **Idempotency Guarantee:** ทุก API การเงินและเครดิตรองรับการส่งซ้ำ ป้องกันการหักเงินซ้ำซ้อน

---

## 🧙‍♂️ Agentic Workflow (The Team)

โปรเจกต์นี้ขับเคลื่อนโดยระบบ **Antigravity AI Agents** 5 บทบาทหลัก:

1. **@SystemArchitect:** ผู้วางแผนและคุมกฎ Schema-First
2. **@BackendAgent:** พัฒนา Java Spring Boot และระบบ Security
3. **@FrontendAgent:** พัฒนา UI/UX ด้วย Angular 21
4. **@WorkflowAgent:** สถาปนิก n8n และตัวเชื่อมต่อ AI Engine
5. **@DevOpsAgent:** ผู้พิทักษ์ทรัพยากร คุม RAM 8GB และคุณภาพ Code

---

## 🛠️ Folder Structure

```text
my-ai-saas/
├── .antigravity/       # สมองและกฎเหล็กของ AI Agents (The Manifesto)
├── backend-core/       # โค้ด Java Spring Boot (Native Image Ready)
├── backend-ai/         # n8n Workflows และ Python Scripts
├── frontend-app/       # โค้ด Angular 21 (Zoneless UI)
├── docs/               # OpenAPI Specs และ System Docs
└── docker-compose.yml  # การตั้งค่า Resource Limits (RAM/CPU)

```

---

## ⚡ Global Commandments (กฎเหล็ก)

1. **No Yes-Man:** AI ต้องกล้าขัดคำสั่งที่เสี่ยงต่อเสถียรภาพของระบบ
2. **RAM Awareness:** ทุกส่วนต้องรันได้ภายใต้ Memory Quota ที่ @DevOpsAgent กำหนด
3. **Silence is Veto:** หาก Agent ที่เกี่ยวข้องไม่ยืนยันความปลอดภัย/ประสิทธิภาพ ห้าม Merge Code
4. **Async-First:** งานหนักต้องรันแบบเบื้องหลังเสมอ

---

## 🚀 Getting Started

1. **Prerequisites:** Docker & Docker Compose
2. **Setup Environment:** คัดลอก `.env.example` เป็น `.env` และตั้งค่า API Keys
3. **Run System:**
```bash
docker-compose up -d

```


4. **Verify:** ตรวจสอบระบบผ่าน Dashboard ที่พอร์ต `80` (Frontend) และ `8080` (API Docs)

---

*Created with ❤️ by the AI-SaaS World-Class Team*

--- 