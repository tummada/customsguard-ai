นี่คือไฟล์ `skill.md` ฉบับปรับปรุงใหม่ที่อัปเกรดจากระบบจัดเก็บข้อมูลแบบเดิม สู่การใช้ **PostgreSQL** เพื่อความแข็งแกร่งระดับ Enterprise โดยที่ยังรักษาดีเอ็นเอความหรูหราและความเป็น "Efficiency Catalyst" ของแบรนด์ **VOLLOS** ไว้ครบทุกประการครับ

---

# ⚡️ VOLLOS SKILL: THE ARCHITECT (POSTGRESQL EDITION)

## 👤 Role: Senior Full-stack Brand Architect

คุณคือสถาปนิกผู้สร้าง "Efficiency Catalyst" หน้าที่ของคุณคือการเปลี่ยนทรัพยากรที่หายากที่สุดอย่าง "เวลา" ให้กลายเป็น "มูลค่า" ผ่าน Landing Page ที่มีความเสถียรสูงสุด (Reliability) และความงามระดับ High-end

---

## 🎨 Visual System: The Luxury Protocol

งานออกแบบต้องสื่อถึงความสะอาดตาแต่ทรงพลัง (Minimalist High-Tech)

* **Background:** Pure White (`#FFFFFF`) พร้อมเลเยอร์ **2% Grain Noise Texture** เพื่อสร้างสัมผัสที่พรีเมียมลดความเป็นดิจิทัลที่แข็งกระด้าง
* **Dynamic Lighting:** **"Adaptive Gold"** ใช้ Radial Gradient สีทอง (`#D4AF37`) จางๆ ที่เคลื่อนที่ตามตำแหน่งเมาส์ (Mouse-track Effect) ภายใต้ Texture
* **Layout:** **Golden Ratio Bento Grid** () จัดวางองค์ประกอบให้ดูสมดุลอย่างเป็นธรรมชาติ
* **Typography:** บังคับใช้ **Inter** หรือ **Manrope** เท่านั้น
* `Letter-spacing: -0.02em`
* `Line-height: 1.6`
* Header ใช้ตัวหนา (Bold) เพื่อความมั่นคง, Body ใช้ Medium เพื่อความโปร่งสบาย



---

## 🛠 Tech Stack & Resilience Engine

เปลี่ยนจากความคล่องตัวของ Spreadsheet สู่ความมั่นคงของฐานข้อมูล Relational

* **Runtime:** Node.js + Express.js
* **Database:** **PostgreSQL** (Managed via `pg` pool)
* **Styling:** Tailwind CSS (Focus: Utility-first luxury)
* **Performance:**
* **Zero-CLS Design:** กำหนด Aspect Ratio ให้รูปภาพและกล่อง Bento เพื่อป้องกันหน้าเว็บกระตุกขณะโหลด
* **Optimistic UI:** เปลี่ยนสถานะปุ่มและแสดง Feedback ทันทีที่คลิกโดยไม่รอ Network Latency


* **Reliability:**
* **Smart Throttling:** ใช้ Debounce Submission ป้องกันการกดรัว
* **SQL Injection Protection:** ใช้ Parameterized Queries (`$1, $2, ...`) ทุกครั้ง
* **Data Sanitization:** ทำ `trim()` และ `escape()` ข้อมูลก่อนบันทึกเข้าสู่ Database



---

## 🗄 Database Schema: The Value Vault

บันทึกทุกโอกาสด้วยโครงสร้างที่รองรับการเติบโต

```sql
CREATE TABLE mkt_leads (
    -- บังคับใช้ UUID v7 (สร้างจาก Application Layer) 
    id UUID PRIMARY KEY, 
    
    -- บังคับใช้สำหรับ Row-Level Security 
    tenant_id UUID NOT NULL, 
    
    name VARCHAR(255) NOT NULL,
    company VARCHAR(255),
    
    -- ทำ Unique Constraint ร่วมกับ tenant_id 
    email VARCHAR(255) NOT NULL,
    
    phone VARCHAR(20),
    
    -- เก็บพฤติกรรมผู้ใช้ [cite: 6]
    metadata JSONB, 
    
    -- ใช้ TIMESTAMPTZ เพื่อความแม่นยำทั่วโลก 
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP 
);

-- สร้าง Index เพื่อความเร็วในการ Query ราย Tenant 
CREATE UNIQUE INDEX idx_mkt_leads_tenant_email ON mkt_leads (tenant_id, email);

-- เปิดใช้งาน Row-Level Security (RLS) ทันที [cite: 23, 43]
ALTER TABLE mkt_leads ENABLE ROW LEVEL SECURITY;

-- สร้าง Policy บังคับกรองด้วย app.current_tenant_id [cite: 23, 43]
CREATE POLICY mkt_leads_isolation_policy ON mkt_leads
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

```

---

## 🖱 UX Strategy: The Value Journey

1. **The Hook:** Hero Section ที่นิ่ง สงบ แต่ทรงพลังด้วยโลโก้ V + Bolt สีทอง
2. **The Interaction:** ปุ่ม CTA หลักที่มี `Gold Glow FX` (Drop shadow ฟุ้งๆ สีทอง) ที่จะสว่างขึ้นเมื่อ Hover
3. **The Ritual:** **"Value Transition"** เมื่อส่งฟอร์มสำเร็จ:
* Step 1: ฟอร์มค่อยๆ Fade-out และ Collapse ลงอย่างนุ่มนวล
* Step 2: ข้อความ "Value Secured" ค่อยๆ ปรากฏขึ้นพร้อม Staggered Animation


4. **The Gratification:** **"Confirmation Ritual"** มอบไฟล์ Efficiency Starter Kit หรือสิทธิพิเศษทันทีที่หน้า Success เพื่อให้ User ได้รับมูลค่า (Value) ในวินาทีนั้นเลย

---

## 🏗 Project Scaffolding

```text
vollos-platform/
├── config/
│   └── db.js          # PostgreSQL Connection Pool
├── public/
│   ├── images/        # VOLLOS Assets
│   └── css/           # Tailwind + Custom Noise Texture
├── views/
│   └── index.ejs      # Bento Grid Layout (Golden Ratio)
├── .env               # DATABASE_URL & Secrets
├── server.js          # Express Logic & Error Handling
└── package.json

```

---

### 🖋 คำแนะนำจาก Engineer (Refinement)

* **Deployment:** แนะนำให้ใช้ **Railway** หรือ **Neon.tech** สำหรับ PostgreSQL เพราะรองรับการขยายตัวได้ดีและตั้งค่าง่ายมากสำหรับ Node.js
* **Index:** อย่าลืมทำ Index ที่ Column `email` ใน PostgreSQL เพื่อให้การตรวจสอบข้อมูลซ้ำ (Duplicate Check) ทำได้รวดเร็วที่สุดในระดับ Milliseconds
 