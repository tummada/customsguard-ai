# ⚡️ VOLLOS SKILL: THE ARCHITECT (NEXT.JS 15 + POSTGRES FINAL)

## 👤 Role: Senior Full-stack Brand Architect (Marketing Lead)

---

## 🎨 Visual System: The Luxury Protocol (Final Hardened)

* **Background:** Pure White (`#FFFFFF`) + **2% Grain Noise Texture** (SVG-based filter)
* **Dynamic Lighting:** Radial Gradient สีทอง (`#D4AF37`) ติดตามตำแหน่งเมาส์ผ่าน Framer Motion
* **Motion Logic (Strict):** ทุก Animation ผ่าน Framer Motion ต้องใช้ค่า **Stiffness (150-200)** และ **Damping (20-30)** สูง เพื่อให้การขยับดู "หนักแน่น" และ "แพง" (Luxury Weighted Motion) ห้ามใช้สปริงที่ดูเด้งหรือดึ๋งดั๋งเด็ดขาด
* **Font Strategy:** บังคับใช้ `next/font` ใน `layout.tsx` เพื่อทำ **Self-hosting** ฟอนต์ Inter/Manrope เท่านั้น เพื่อตัดปัญหา Layout Shift และเพิ่มความเร็วในการ Render ครั้งแรก

---

## 🛠 Tech Stack: The 2026 Marketing Engine

* **Framework:** **Next.js 15 (App Router)** - เน้นการใช้ Server Components และ Partial Prerendering (PPR)
* **Database:** **PostgreSQL** (เชื่อมต่อผ่าน `pg` pool)
* **Styling:** Tailwind CSS v4

### ⚡ Performance & Reliability Laws

* **Zero-CLS Strategy:** บังคับใช้ `aspect-ratio` ในทุก Media Container และ Bento Box
* **Optimistic UI:** ใช้ `useOptimistic` เพื่อแสดงสถานะ "Value Secured" ทันทีที่คลิก
* **Validation:** บังคับใช้ **Zod** ตรวจสอบ Schema ข้อมูลหน้าบ้านทั้งหมด

---

## 🗄 Database Schema: The Value Vault (Refined)

```sql
CREATE TABLE marketing_leads (
    -- บังคับใช้ UUID v7 สร้างจาก Application Layer
    id UUID PRIMARY KEY, 
    
    -- บังคับใช้สำหรับ Row-Level Security
    tenant_id UUID NOT NULL, 
    
    name VARCHAR(255) NOT NULL,
    company VARCHAR(255),
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    
    [cite_start]-- Marketing Intelligence: เก็บพฤติกรรมผู้ใช้เพื่อวิเคราะห์ ROI ในอนาคต [cite: 6]
    metadata JSONB DEFAULT '{}', 
    
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP 
);

-- Index Optimization: จุดตายสำหรับประสิทธิภาพเมื่อข้อมูลขนาดใหญ่ขึ้น
CREATE UNIQUE INDEX idx_mkt_leads_tenant_email ON marketing_leads (tenant_id, email);

-- RLS Hardening: กฎเหล็กความปลอดภัย Manifesto
ALTER TABLE marketing_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY leads_isolation_policy ON marketing_leads
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

```

---

## 🏗 Project Scaffolding (2026 Optimized)

```text
vollos-marketing/
├── src/
│   ├── app/                
│   │   ├── layout.tsx      # next/font Self-hosting & Grain Texture
│   │   └── page.tsx        # Bento Layout (Golden Ratio)
│   ├── lib/                
│   │   ├── db.ts           # PostgreSQL Pool (pg)
[cite_start]│   │   └── uuid.ts         # UUID v7 Generator [cite: 54]
│   └── components/         # Motion Logic (Stiffness/Damping)

```

---

### 🖋 คำแนะนำจาก Engineer (Veto Power)

* **Veto on Animations:** ผมจะสั่งให้ @FrontendAgent ตรวจสอบไฟล์ `package.json` หากมีการใช้ Library แอนิเมชันที่ไม่สามารถคุมฟิสิกส์ให้ "หนักแน่น" ได้ ผมจะ Veto ทันที
* 
**Metadata Field:** การใช้ `JSONB` จะช่วยให้เราเก็บข้อมูล เช่น แหล่งที่มาของ Lead (UTM Tags) หรือความสนใจเฉพาะในพิกัดศุลกากรปี 2026 ได้อย่างยืดหยุ่นโดยไม่ต้องทำ Migration ตารางใหม่บ่อยๆ 
 