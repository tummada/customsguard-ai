-- V1016: Add CHECK constraint for HS code format
-- Valid formats:
--   DDDD       (4-digit heading, e.g., 0101)
--   DDDD.DD    (6-digit subheading, e.g., 0306.17)
--   DDDD.DD.DD (8-digit tariff line, e.g., 0810.60.00)
--   DDDD.DD.DD.DD (10-digit national line, e.g., 0101.30.10.00)

ALTER TABLE cg_hs_codes
  ADD CONSTRAINT chk_hs_code_format
  CHECK (code ~ '^\d{4}(\.\d{2}){0,3}$');
