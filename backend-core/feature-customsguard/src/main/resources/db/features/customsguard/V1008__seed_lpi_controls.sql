-- =============================================================
-- V1008: Seed LPI Controls (ของต้องกำกัด / ใบอนุญาต)
-- HS codes use short prefix (4-6 digits, no dots) for prefix matching
-- against full 8-10 digit AHTN codes from declarations
-- =============================================================

INSERT INTO cg_lpi_controls (id, hs_code, control_type, agency_code, agency_name_th, agency_name_en, requirement_th, requirement_en, applies_to, source_url)
VALUES
    (gen_random_uuid(), '8471', 'STANDARD', 'TISI', 'สำนักงานมาตรฐานผลิตภัณฑ์อุตสาหกรรม (สมอ.)', 'Thai Industrial Standards Institute', 'ต้องมีใบรับรองมาตรฐาน มอก. สำหรับเครื่องคอมพิวเตอร์และอุปกรณ์', 'TIS certification required for computers and peripherals', 'IMPORT', 'https://www.tisi.go.th'),

    (gen_random_uuid(), '030617', 'LICENSE', 'FDA', 'สำนักงานคณะกรรมการอาหารและยา (อย.)', 'Food and Drug Administration', 'ต้องมีใบอนุญาตนำเข้าอาหาร และใบรับรองสุขอนามัยจากประเทศต้นทาง', 'Food import license and health certificate from origin country required', 'IMPORT', 'https://www.fda.moph.go.th'),

    (gen_random_uuid(), '0306', 'LICENSE', 'FDA', 'สำนักงานคณะกรรมการอาหารและยา (อย.)', 'Food and Drug Administration', 'ต้องมีใบอนุญาตนำเข้าอาหารทะเล (สัตว์น้ำจำพวกกุ้ง ปู)', 'Import license required for crustaceans', 'IMPORT', 'https://www.fda.moph.go.th'),

    (gen_random_uuid(), '8517', 'PERMIT', 'NBTC', 'สำนักงานคณะกรรมการกิจการกระจายเสียง กิจการโทรทัศน์ และกิจการโทรคมนาคมแห่งชาติ (กสทช.)', 'National Broadcasting and Telecommunications Commission', 'ต้องมีใบอนุญาตนำเข้าเครื่องโทรคมนาคม ตาม พ.ร.บ.วิทยุคมนาคม', 'Telecommunications equipment import permit required', 'IMPORT', 'https://www.nbtc.go.th'),

    (gen_random_uuid(), '3004', 'LICENSE', 'FDA', 'สำนักงานคณะกรรมการอาหารและยา (อย.)', 'Food and Drug Administration', 'ต้องมีใบอนุญาตนำเข้ายาแผนปัจจุบัน และขึ้นทะเบียนตำรับยา', 'Drug import license and pharmaceutical registration required', 'IMPORT', 'https://www.fda.moph.go.th'),

    (gen_random_uuid(), '2208', 'LICENSE', 'EXCISE', 'กรมสรรพสามิต', 'Excise Department', 'ต้องมีใบอนุญาตนำเข้าสุราและเครื่องดื่มแอลกอฮอล์ พร้อมชำระภาษีสรรพสามิต', 'Alcohol import license required with excise tax payment', 'IMPORT', 'https://www.excise.go.th'),

    (gen_random_uuid(), '1006', 'PERMIT', 'DFT', 'กรมการค้าต่างประเทศ', 'Department of Foreign Trade', 'ต้องมีใบอนุญาตนำเข้าข้าว ตามประกาศกระทรวงพาณิชย์', 'Rice import permit required per Ministry of Commerce announcement', 'IMPORT', 'https://www.dft.go.th'),

    (gen_random_uuid(), '0207', 'LICENSE', 'FDA', 'สำนักงานคณะกรรมการอาหารและยา (อย.)', 'Food and Drug Administration', 'ต้องมีใบอนุญาตนำเข้าเนื้อสัตว์ปีก พร้อมใบรับรองสุขอนามัยจากประเทศต้นทาง', 'Poultry meat import license and health certificate required', 'IMPORT', 'https://www.fda.moph.go.th'),

    (gen_random_uuid(), '4011', 'STANDARD', 'TISI', 'สำนักงานมาตรฐานผลิตภัณฑ์อุตสาหกรรม (สมอ.)', 'Thai Industrial Standards Institute', 'ต้องมีใบรับรองมาตรฐาน มอก. สำหรับยางล้อรถยนต์', 'TIS certification required for rubber tires', 'IMPORT', 'https://www.tisi.go.th');
