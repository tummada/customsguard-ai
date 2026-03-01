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
        headlineHighlight: "", // handled within headlineMain via special token or just render raw HTML if needed
        subheadline: "แม่นยำ 100% ด้วย AI วิเคราะห์พิกัดอัตโนมัติ สำหรับชิปปิ้งและ SME ไทย",
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
            { stat: "73%", label: "ของข้อผิดพลาดมาจากการคีย์ด้วยมือ" },
            { stat: "3 ชม.", label: "เฉลี่ยต่อใบขน 1 รายการ" },
            { stat: "฿120K+", label: "ค่าปรับเฉลี่ยต่อครั้งจากพิกัดผิด" },
        ]
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
                description: "ลดเวลาจัดทำเอกสารศุลกากร จากชั่วโมงเหลือนาที",
                statValue: "98.2%",
                statLabel: "ลดเวลาทำงาน"
            },
            {
                id: "privilege-optimizer",
                iconId: "shield",
                title: "ทวงคืนกำไรที่หายไป",
                description: "ระบบเช็กสิทธิ FTA และ Form E ให้อัตโนมัติ ไม่ให้คุณจ่ายภาษีเกินแม้แต่บาทเดียว",
                badges: ["FTA Auto-Check", "Form E"]
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
    footer: {
        tagline: "Where Time Becomes Value",
        copyright: "© 2026 VOLLOS Intelligence. Compliant with Customs Department standards 2026"
    }
};
