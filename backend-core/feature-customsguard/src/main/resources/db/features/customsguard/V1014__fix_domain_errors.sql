-- =============================================================
-- V1014: Fix domain-specific requirement errors
-- แก้ข้อผิดพลาดที่เกิดจากเข้าใจ requirement ผิด
-- =============================================================

-- =============================================
-- FIX 1: TAFTA form name ผิด
-- ค่าเดิม: "Form AAT" (seed V1007) / "Form TAFTA" (pipeline)
-- ค่าถูก: "Form FTA" (อ้างอิง ecs-support.github.io / กรมศุลกากร)
-- =============================================
UPDATE cg_fta_rates
SET form_type = 'Form FTA'
WHERE fta_name = 'TAFTA'
  AND form_type IN ('Form AAT', 'Form TAFTA', 'Form TAL');

-- =============================================
-- FIX 2: Normalize LPI HS code prefixes
-- ค่าเดิม: ไม่สม่ำเสมอ (030617 กับ 0306 ปนกัน)
-- ค่าถูก: ใช้ 4-digit chapter level สม่ำเสมอ
-- (หมายเหตุ: 030617 → 0306 เพราะ LPI ควบคุมระดับ chapter)
-- =============================================
UPDATE cg_lpi_controls
SET hs_code = '0306'
WHERE hs_code = '030617';

-- =============================================
-- FIX 3: Fix "Form TAL" in regulation text chunks
-- ค่าเดิม: "Form TAL" (V1011 regulations)
-- ค่าถูก: "Form FTA" (อ้างอิง ecs-support.github.io)
-- =============================================
UPDATE cg_document_chunks
SET chunk_text = REPLACE(chunk_text, 'Form TAL', 'Form FTA')
WHERE chunk_text LIKE '%Form TAL%';

UPDATE cg_regulations
SET content = REPLACE(content, 'Form TAL', 'Form FTA')
WHERE content LIKE '%Form TAL%';
