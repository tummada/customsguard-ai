import { ProductConfig } from "../../types/product";

export const hsCodeConfig: ProductConfig = {
    slug: "hs-code",
    tenantId: "vollos-hs-code",
    productCategory: "AI HS-Code Suggestion",
    meta: {
        title: "VOLLOS - AI จัดการใบขนสินค้า",
        description: "ระบบ AI จัดการใบขนสินค้าสำหรับชิปปิ้งไทย",
    },
    navbar: {
        ctaText: "จองสิทธิ์ด่วน"
    },
    hero: {
        kicker: "เมื่อเวลาของคุณ... กลายเป็นมูลค่า",
        headlineMain: "หยุดนรกการคีย์ใบขน<time_collapse>ด้วยความแม่นยำระดับ AI 2026",
        headlineHighlight: "",
        subheadline: "ผู้ช่วยอัจฉริยะที่จำพิกัดได้แม่น อ่าน PDF ได้เอง คำนวณภาษีที่ประหยัดได้ใน 2 นาที",
        socialProof: "ประหยัดภาษีนำเข้าได้ถึง ฿65,000 ต่อ shipment",
        personaLine: "สำหรับชิปปิ้งที่ออกของ 4+ shipments/วัน",
        demoImageSrc: "https://placehold.co/1280x720/FAFAFA/D4AF37?text=VOLLOS+AI+Workflow+Demo",
        demoImageAlt: "VOLLOS AI Workflow Demo"
    },
    pain: {
        imageSrc: "https://placehold.co/600x400/FAFAFA/999999?text=Manual+Entry+Errors",
        imageAlt: "ความผิดพลาดจากการคีย์ข้อมูลด้วยมือ",
        kicker: "ต้นทุนที่ซ่อนอยู่",
        headline: "หยุดจ่ายค่าปรับ<br />ที่คุณไม่ได้ก่อ",
        description: "HS-Code ผิด 1 ตัว = ค่าปรับหลักแสน และเสียเวลาหลักสัปดาห์ ความผิดพลาดส่วนใหญ่เกิดจากการคีย์ซ้ำที่เหนื่อย ไม่ใช่ความประมาท\n\nกรมศุลฯ ตรวจย้อนหลังได้ 10 ปี... คุณมั่นใจแค่ไหนว่าใบขนที่คีย์เมื่อวานจะไม่กลายเป็นค่าปรับในอีก 3 ปีข้างหน้า?",
        stats: [
            { stat: "73%", label: "ของข้อผิดพลาดมาจากการคีย์ด้วยมือ", solution: "AI Scan ลดเหลือ 0%" },
            { stat: "3 ชม.", label: "เฉลี่ยต่อใบขน 1 รายการ", solution: "VOLLOS ทำเสร็จใน 2 นาที" },
            { stat: "฿120K+", label: "ค่าปรับเฉลี่ยต่อครั้งจากพิกัดผิด", solution: "ลดโอกาสแก้ใบขน 80%" },
        ]
    },
    roi: {
        kicker: "ผลลัพธ์ที่พิสูจน์ได้",
        headline: "ประหยัดได้จริง ฿3.5 ล้านต่อปี",
        cards: [
            {
                country: "ญี่ปุ่น",
                flag: "\uD83C\uDDEF\uD83C\uDDF5",
                agreement: "JTEPA",
                normalRate: "20%",
                ftaRate: "5%",
                savingsPerShipment: "฿65,000"
            },
            {
                country: "จีน",
                flag: "\uD83C\uDDE8\uD83C\uDDF3",
                agreement: "ACFTA",
                normalRate: "15%",
                ftaRate: "0%",
                savingsPerShipment: "฿50,000"
            },
            {
                country: "อาเซียน",
                flag: "\uD83C\uDDF9\uD83C\uDDED",
                agreement: "ATIGA",
                normalRate: "12%",
                ftaRate: "0%",
                savingsPerShipment: "฿96,000"
            }
        ],
        summaries: [
            { label: "FTA Savings", amount: "฿3.12M" },
            { label: "ลดแก้ใบขน", amount: "฿168K" },
            { label: "เวลาที่ประหยัด", amount: "฿240K" }
        ],
        totalLabel: "รวมประหยัดต่อปี",
        totalAmount: "บาท/ปี"
    },
    process: {
        kicker: "ขั้นตอนง่ายๆ 3 ขั้นตอน",
        headline: "3 ขั้นตอนสู่ความแม่นยำระดับ AI",
        steps: [
            {
                iconId: "upload",
                step: "01",
                title: "อัปโหลด PDF",
                desc: "อัปโหลด Invoice หรือ Packing List ผ่านระบบ Secure Cloud เพื่อการวิเคราะห์ข้อมูลทันที",
                imgSrc: "https://placehold.co/600x400/FAFAFA/D4AF37?text=PDF+Scanning+Demo",
                imgAlt: "PDF Scanning Demo",
            },
            {
                iconId: "search-ai",
                step: "02",
                title: "AI ตรวจพิกัด",
                desc: "AI เลือก HS-Code ที่ปลอดภัยและประหยัดที่สุด พร้อมเช็กสิทธิ FTA และ Form E ให้อัตโนมัติ",
                imgSrc: "https://placehold.co/600x400/FAFAFA/D4AF37?text=AI+HS-Code+Analysis",
                imgAlt: "AI HS-Code Analysis",
            },
            {
                iconId: "sparkles",
                step: "03",
                title: "Magic Fill",
                desc: "ไม่ต้อง Alt-Tab อีกต่อไป: ฉีดข้อมูลจาก Invoice เข้าเว็บกรมศุลฯ โดยตรง แม่นยำ 100% แม้เอกสารจะอ่านยาก",
                imgSrc: "https://placehold.co/600x400/FAFAFA/D4AF37?text=Chrome+Extension+Demo",
                imgAlt: "Magic Fill — Chrome Extension",
            }
        ]
    },
    beforeAfter: {
        kicker: "เปรียบเทียบ",
        headline: "ก่อน vs หลังใช้ VOLLOS",
        badge: "15x เร็วกว่าเดิม",
        rows: [
            { task: "อ่าน PDF", before: "พิมพ์มือ (เสี่ยงพิมพ์ผิด)", after: "AI Scan + OCR อัตโนมัติ" },
            { task: "ค้นหา HS Code", before: "เปิดเล่มพิกัด/ค้น Keyword", after: "AI Semantic Search" },
            { task: "ตรวจสอบ FTA", before: "เช็ค Manual ทีละฉบับ", after: "Auto-Alert + คำนวณเงินประหยัด" },
            { task: "เรทแลกเปลี่ยน", before: "เช็ค Manual ทุกสัปดาห์", after: "ดึงเรทประกาศกรมศุลฯ อัตโนมัติ" },
            { task: "Post-Audit", before: "จำเอกสารอ้างอิงเอง", after: "Audit Trail เก็บ Log" },
            { task: "ระบบค้าง", before: "คีย์ใหม่ตั้งแต่ต้น", after: "Auto-Save Draft ในเครื่อง" }
        ]
    },
    features: {
        cards: [
            {
                id: "main-feature",
                iconId: "target",
                title: "เกราะป้องกันพิกัดผิด",
                description: "AI เลือก HS-Code ที่ปลอดภัยและประหยัดที่สุดให้คุณอัตโนมัติ",
                badges: ["AI แม่นยำ", "ตรวจพิกัดอัตโนมัติ"]
            },
            {
                id: "efficiency-metric",
                iconId: "zap",
                title: "",
                description: "จาก 30 นาที เหลือ 2 นาที รับงานได้มากขึ้น 5-10 เท่า",
                statValue: "15x",
                statLabel: "เร็วกว่าวิธีเดิม"
            },
            {
                id: "privilege-optimizer",
                iconId: "shield",
                title: "ทวงคืนกำไรที่หายไป",
                description: "ระบบเช็กสิทธิ FTA ให้อัตโนมัติ ประหยัดได้ถึง ฿65,000 ต่อ shipment ไม่ให้คุณจ่ายภาษีเกินแม้แต่บาทเดียว",
                badges: ["FTA Auto-Check", "JTEPA", "ACFTA", "ATIGA"]
            },
            {
                id: "shadow-auditor",
                iconId: "eye-scan",
                title: "Shadow Auditor",
                description: "จำลองการตรวจสอบล่วงหน้าด้วยฐานข้อมูลราคาตลาดโลก (Market Price) ระบุจุดเสี่ยงทันทีหากราคาหรือพิกัดของคุณมีโอกาสถูกเพิกถอนหรือเรียกเก็บภาษีย้อนหลัง",
                badges: ["สุ่มตรวจย้อนหลัง", "Market Check"]
            },
            {
                id: "smart-grouping",
                iconId: "layers",
                title: "Smart Grouping & Fee Saver",
                description: "ยุบรวมรายการสินค้าพิกัดเดียวกันอัตโนมัติด้วย AI ลดความซับซ้อนของเอกสารใบขน และประหยัดค่าธรรมเนียมต่อรายการ (Entry Fee) ได้สูงสุด 40%",
                badges: ["Group Item", "ลดค่าธรรมเนียม 40%"]
            },
            {
                id: "regtech-permit-guard",
                iconId: "clipboard-check",
                title: "RegTech Permit Guard",
                description: "วิเคราะห์พิกัดและแสดงรายการใบอนุญาตที่ต้องใช้ (LPI) ทันทีที่อัปโหลดไฟล์ (มอก./อย./สมอ.) ป้องกันปัญหาสินค้าติดด่านและค่าโกดังค้างส่ง 100%",
                badges: ["LPI Check", "มอก. / อย."]
            }
        ]
    },
    security: {
        headline: "ความปลอดภัยและการรักษาความลับ",
        description: "เราดูแลข้อมูลของคุณเหมือนเป็นสมบัติของตัวเอง. สำรองข้อมูลบัญชีให้พร้อมใช้เสมอ และไม่เปิดเผยข้อมูลการค้าใน Invoice ของคุณให้ใครเห็น 100%",
        labels: ["AES-256 ENCRYPTED", "ISO-27001 READY", "PDPA COMPLIANT"],
        statusLines: [
            { label: "การเชื่อมต่อ", status: "ปลอดภัยสูงสุด", statusColor: "text-green-600" },
            { label: "ข้อมูลการค้า", status: "เป็นส่วนตัว 100%", statusColor: "text-green-600" },
            { label: "ระบบสำรอง", status: "ทำงานตลอดเวลา", statusColor: "text-green-600" }
        ]
    },
    faq: {
        kicker: "คำถามที่พบบ่อย",
        headline: "มีคำถาม? เรามีคำตอบ",
        items: [
            {
                question: "ข้อมูลลูกค้าผมหลุดไหม?",
                answer: "ข้อมูลทุกบัญชีแยกกันด้วย Row-Level Security (RLS) ระดับฐานข้อมูล — แม้แต่ทีมงาน VOLLOS ก็ไม่สามารถเห็นข้อมูล Invoice ของลูกค้าคุณได้ ระบบ production จะเข้ารหัสผ่าน HTTPS และเข้ารหัสข้อมูลจัดเก็บเพิ่มเติม"
            },
            {
                question: "AI ผิดแล้วใครรับผิดชอบ?",
                answer: "VOLLOS ทำงานแบบ Human-in-the-loop — AI แนะนำพิกัดและตรวจสอบให้ แต่การยืนยันสุดท้ายเป็นของคุณเสมอ ระบบแสดงคะแนนความมั่นใจ (Confidence Score) และเอกสารอ้างอิงทุกครั้ง เพื่อให้คุณตัดสินใจได้อย่างมั่นใจ"
            },
            {
                question: "เชื่อมต่อ Netbay/TIFFA ได้มั้ย?",
                answer: "ตอนนี้ยังเชื่อมตรงไม่ได้ แต่ Chrome Extension ฉีดข้อมูลเข้าเว็บกรมศุลฯ ได้ทันทีผ่าน Magic Fill และเรากำลังพัฒนา XML Export เพื่อให้นำเข้า Netbay/TIFFA ได้ในอนาคต — สมาชิก Founder's Club จะได้ร่วมกำหนด format ที่ใช้จริง"
            },
            {
                question: "ข้อมูลเก็บที่ไหน? เอาไปเทรน AI มั้ย?",
                answer: "ข้อมูลหลัก (ฐานข้อมูล, ไฟล์ PDF) เก็บในเซิร์ฟเวอร์ของ VOLLOS โดยตรง การวิเคราะห์ AI ใช้ Google Gemini API ซึ่งข้อมูลที่ส่งไปจะไม่ถูกนำไปเทรน model ตามเงื่อนไข Google — เราไม่แชร์ข้อมูลกับบริษัทอื่นใดนอกจากนี้"
            },
            {
                question: "ราคาเท่าไหร่?",
                answer: "สมาชิก Founder's Club รับส่วนลด 50% ตลอดชีพ — จ่ายครึ่งเดียวตลอดการใช้งาน ไม่มีค่าแรกเข้า ยกเลิกได้ทุกเมื่อ จำกัดเพียง 10 บริษัทแรกเท่านั้น"
            }
        ]
    },
    footer: {
        tagline: "Where Time Becomes Value",
        copyright: "\u00A9 2026 VOLLOS Intelligence. Compliant with Customs Department standards 2026"
    }
};
