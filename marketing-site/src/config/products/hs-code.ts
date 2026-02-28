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
        headlineMain: "เปลี่ยนมาตรฐานการจัดการใบขนสินค้า.<br />จาก<time_collapse>สู่ความแม่นยำระดับ 100%",
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
        description: "HS-Code ผิด 1 ตัว = ค่าปรับหลักแสน และเสียเวลาหลักสัปดาห์ ความผิดพลาดส่วนใหญ่เกิดจากการคีย์ซ้ำที่เหนื่อย ไม่ใช่ความประมาท",
        stats: [
            { stat: "73%", label: "ของข้อผิดพลาดมาจากการคีย์ด้วยมือ" },
            { stat: "3 ชม.", label: "เฉลี่ยต่อใบขน 1 รายการ" },
            { stat: "฿120K+", label: "ค่าปรับเฉลี่ยต่อครั้งจากพิกัดผิด" },
        ]
    },
    process: {
        kicker: "ขั้นตอนง่ายๆ 3 ขั้นตอน",
        headline: "ทำงานยังไง? ง่ายมาก.",
        steps: [
            {
                iconId: "upload",
                step: "01",
                title: "อัปโหลด PDF",
                desc: "โยนไฟล์ Invoice หรือ Packing List เข้าสู่ระบบ",
                imgSrc: "https://placehold.co/600x400/FAFAFA/D4AF37?text=PDF+Scanning+Demo",
                imgAlt: "PDF Scanning Demo",
            },
            {
                iconId: "search-ai",
                step: "02",
                title: "AI ตรวจพิกัด",
                desc: "AI วิเคราะห์ HS-Code และภาษีที่ประหยัดที่สุด",
                imgSrc: "https://placehold.co/600x400/FAFAFA/D4AF37?text=AI+HS-Code+Analysis",
                imgAlt: "AI HS-Code Analysis",
            },
            {
                iconId: "sparkles",
                step: "03",
                title: "Magic Fill",
                desc: "กดปุ่มเดียว ข้อมูลไหลเข้าระบบศุลกากรอัตโนมัติ ผ่าน Chrome Extension ไม่ต้องพิมพ์ซ้ำอีกต่อไป",
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
                title: "AI HS-Code Suggestion",
                description: "ไม่ต้องงมพิกัดศุลกากร AI แนะนำ HS-Code ให้อัตโนมัติ ตรวจสอบใบขนสินค้าให้ถูกต้อง 100% ก่อนยื่น",
                badges: ["AI แม่นยำ", "ตรวจพิกัดอัตโนมัติ"]
            },
            {
                id: "efficiency-metric",
                iconId: "zap",
                title: "",
                description: "ลดเวลาจัดทำเอกสารศุลกากร จากชั่วโมงเหลือนาที",
                statValue: "98.2%",
                statLabel: "ลดเวลาทำงาน"
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
