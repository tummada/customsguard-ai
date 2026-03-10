-- V1016: Add CHECK constraint for HS code format
-- Valid formats: DDDD.DD (6-digit) or DDDD.DD.DD (8-digit)
-- Examples: 0306.17, 0810.60.00

ALTER TABLE cg_hs_codes
  ADD CONSTRAINT chk_hs_code_format
  CHECK (code ~ '^\d{4}\.\d{2}(\.\d{2})?$');
