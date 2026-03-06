-- Add nurture columns for n8n lead-nurture workflow
ALTER TABLE marketing_leads ADD COLUMN IF NOT EXISTS nurture_status VARCHAR(50) DEFAULT 'new';
ALTER TABLE marketing_leads ADD COLUMN IF NOT EXISTS nurtured_at TIMESTAMPTZ;

-- Index for workflow polling: find leads by status
CREATE INDEX IF NOT EXISTS idx_mkt_leads_nurture ON marketing_leads (nurture_status, created_at);
