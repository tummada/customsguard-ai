-- =============================================================
-- Tier 2: ตารางเสริมสำหรับความครบถ้วนระดับ Expert
-- Anti-Dumping, Excise Tax, BOI, LPI Controls
-- =============================================================

-- 1. Anti-Dumping / Countervailing Duties (AD/CVD)
--    สินค้าที่โดนบวกภาษีพิเศษจากประเทศที่ทุ่มตลาด
CREATE TABLE cg_ad_duties (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    hs_code             VARCHAR(12) NOT NULL,
    product_name_th     TEXT,
    product_name_en     TEXT,
    origin_country      VARCHAR(3)  NOT NULL,      -- ประเทศที่โดน AD
    duty_type           VARCHAR(10) NOT NULL,       -- AD / CVD / SAFEGUARD
    additional_rate     NUMERIC(6,2) NOT NULL,      -- อัตราภาษีพิเศษ %
    effective_from      DATE        NOT NULL,
    effective_to        DATE,
    announcement_number VARCHAR(100),               -- เลขที่ประกาศ
    source_url          TEXT,
    created_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cg_ad_hs ON cg_ad_duties (hs_code);
CREATE INDEX idx_cg_ad_country ON cg_ad_duties (origin_country);

-- 2. Excise Tax (ภาษีสรรพสามิตสำหรับสินค้านำเข้า)
CREATE TABLE cg_excise_rates (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    hs_code             VARCHAR(12) NOT NULL,
    product_category    VARCHAR(100),               -- เช่น รถยนต์, เครื่องดื่ม
    excise_rate         NUMERIC(6,2),               -- อัตรา %
    excise_rate_specific TEXT,                       -- อัตราตามปริมาณ (เช่น บาท/ลิตร)
    calculation_method  VARCHAR(20),                -- AD_VALOREM / SPECIFIC / COMPOUND
    conditions          TEXT,
    source_url          TEXT,
    created_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cg_excise_hs ON cg_excise_rates (hs_code);

-- 3. BOI Privileges (สิทธิประโยชน์ BOI)
CREATE TABLE cg_boi_privileges (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_code       VARCHAR(20),                -- รหัสกิจกรรม BOI
    activity_name_th    TEXT,
    activity_name_en    TEXT,
    hs_codes            VARCHAR(12)[],              -- พิกัดที่เกี่ยวข้อง
    privilege_type      VARCHAR(30) NOT NULL,       -- MACHINERY_EXEMPT / RAW_MATERIAL_EXEMPT / TAX_HOLIDAY
    section_ref         VARCHAR(20),                -- มาตรา เช่น 28, 29, 36
    duty_reduction      NUMERIC(6,2),               -- % ลดหย่อน (NULL = ยกเว้นทั้งหมด)
    conditions          TEXT,
    source_url          TEXT,
    created_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cg_boi_hs ON cg_boi_privileges USING GIN (hs_codes);
CREATE INDEX idx_cg_boi_type ON cg_boi_privileges (privilege_type);

-- 4. LPI Controls (ของต้องกำกัด / ใบอนุญาต)
CREATE TABLE cg_lpi_controls (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    hs_code             VARCHAR(12) NOT NULL,
    control_type        VARCHAR(30) NOT NULL,       -- LICENSE / PERMIT / CERTIFICATE / STANDARD
    agency_code         VARCHAR(20),                -- เช่น FDA, TISI, NBTC
    agency_name_th      VARCHAR(200),               -- เช่น อย., สมอ., กสทช.
    agency_name_en      VARCHAR(200),
    requirement_th      TEXT,                       -- เงื่อนไขที่ต้องทำ
    requirement_en      TEXT,
    applies_to          VARCHAR(10) DEFAULT 'IMPORT', -- IMPORT / EXPORT / BOTH
    source_url          TEXT,
    created_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_cg_lpi_hs ON cg_lpi_controls (hs_code);
CREATE INDEX idx_cg_lpi_agency ON cg_lpi_controls (agency_code);
