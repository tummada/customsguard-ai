# n8n Workflow Templates

## Workflows

### 1. sheets-review-sync
- Trigger: Cron ทุก 30 นาที
- ดึง draft content จาก DB → เขียนลง Google Sheets
- Trigger: Cron หลังเที่ยงคืน
- ดึง row ที่ Finished=true, Final_Status=Approved, Synced=false
- UPDATE DB: status='scheduled'
- เขียนกลับ Sheet: Synced=true

### 2. blog-publisher
- Trigger: Cron ทุก 1 ชม.
- Query: status='scheduled' AND content_type='blog' AND scheduled_at <= now()
- UPDATE status='published'

### 3. social-publisher
- Trigger: Cron ทุก 1 ชม. (22:00-06:00)
- Query: status='scheduled' AND content_type IN ('fb','ig','tiktok','youtube','x')
- โพสไปแต่ละ platform API
- Error handler: 401 → notification ให้ refresh token

### 4. token-refresh
- Trigger: Cron ทุกวัน 06:00
- ตรวจ Meta long-lived token (หมดอายุ 60 วัน)
- Auto-refresh ถ้าเหลือ < 7 วัน
- Notification ถ้า refresh fail

### 5. lead-nurture
- Trigger: new row in marketing_leads
- Send welcome email (SendGrid)
- Wait 3 days → educational email
- Wait 7 days → case study email

## Setup Instructions

1. เปิด n8n UI (https://vollos.ai/n8n/)
2. Import workflow JSON files
3. Configure credentials:
   - PostgreSQL (vollos DB)
   - Google Sheets (OAuth2)
   - Meta Graph API (FB/IG)
   - TikTok Content API
   - YouTube Data API v3
   - X/Twitter API v2
   - SendGrid SMTP
   - Line/Discord webhook
4. Activate workflows

## SQL queries ที่ n8n ใช้

```sql
-- ดึง draft content
SELECT * FROM mkt_content WHERE status='draft' LIMIT 50;

-- schedule content
UPDATE mkt_content SET status='scheduled', is_fact_checked=true
WHERE id = $1 AND confidence_score >= 80;

-- publish content
UPDATE mkt_content SET status='published', published_at=now()
WHERE status='scheduled' AND scheduled_at <= now() AND content_type=$1;

-- ดึง content สำหรับโพส social
SELECT * FROM mkt_content
WHERE status='scheduled'
  AND content_type IN ('fb','ig','tiktok','youtube','x')
  AND scheduled_at <= now()
  AND image_url IS NOT NULL  -- IG/TikTok ต้องมีรูป
LIMIT 10;
```
