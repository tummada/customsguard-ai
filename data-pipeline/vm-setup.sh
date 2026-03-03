#!/bin/bash
# =============================================================
#  VM Setup Script — รันบน GCP VM หลัง SSH เข้ามา
#
#  ติดตั้ง Python, clone repo, setup database, พร้อมรัน pipeline
#
#  Usage (บน VM):
#    curl -sSL https://raw.githubusercontent.com/YOUR_REPO/main/data-pipeline/vm-setup.sh | bash
#    หรือ
#    chmod +x vm-setup.sh && ./vm-setup.sh
# =============================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }

echo ""
echo "=============================================="
echo "  VM Setup — CustomsGuard Pipeline"
echo "=============================================="
echo ""

# ── Step 1: System packages ───────────────────────────────────
echo "── Step 1: ติดตั้ง system packages ─────────────"

sudo apt-get update -qq
sudo apt-get install -y -qq \
    python3 python3-pip python3-venv \
    postgresql-client \
    git \
    poppler-utils \
    > /dev/null 2>&1

log "System packages ติดตั้งเสร็จ"

# ── Step 2: Clone repo ────────────────────────────────────────
echo ""
echo "── Step 2: Clone repository ───────────────────"

WORK_DIR="$HOME/aiservice"

if [ -d "$WORK_DIR" ]; then
    warn "Repository มีอยู่แล้วที่ $WORK_DIR — pull latest"
    cd "$WORK_DIR"
    git pull --ff-only 2>/dev/null || true
else
    echo "  กรุณาใส่ Git repo URL (หรือ Enter เพื่อข้ามและ copy ไฟล์เอง):"
    read -r REPO_URL

    if [ -n "$REPO_URL" ]; then
        git clone "$REPO_URL" "$WORK_DIR"
        log "Clone เสร็จ"
    else
        mkdir -p "$WORK_DIR/data-pipeline"
        warn "ข้าม clone — ต้อง copy ไฟล์ data-pipeline/ มาเอง"
        echo "  ใช้คำสั่ง: gcloud compute scp --recurse ./data-pipeline $VM_NAME:~/aiservice/data-pipeline"
    fi
fi

cd "$WORK_DIR/data-pipeline"

# ── Step 3: Python virtual environment ────────────────────────
echo ""
echo "── Step 3: Python virtual environment ─────────"

if [ ! -d "venv" ]; then
    python3 -m venv venv
    log "venv สร้างเสร็จ"
else
    warn "venv มีอยู่แล้ว"
fi

source venv/bin/activate
pip install --quiet --upgrade pip
pip install --quiet -r requirements.txt
log "Python dependencies ติดตั้งเสร็จ"

# ── Step 4: Setup .env ────────────────────────────────────────
echo ""
echo "── Step 4: ตั้งค่า .env ───────────────────────"

if [ -f ".env" ]; then
    warn ".env มีอยู่แล้ว — ข้าม"
else
    if [ -f "/tmp/pipeline.env" ]; then
        cp /tmp/pipeline.env .env
        log "คัดลอก .env จาก /tmp/pipeline.env"
    else
        cp .env.example .env
        warn "สร้าง .env จาก template — ต้องแก้ไขค่าเอง!"
    fi
fi

echo ""
echo "  ตรวจสอบ .env:"
cat .env
echo ""
echo "  ถ้าต้องแก้ไข: nano .env"

# ── Step 5: Test database connection ──────────────────────────
echo ""
echo "── Step 5: ทดสอบ Database connection ───────────"

# Read .env
source <(grep -v '^#' .env | sed 's/^/export /')

if PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" > /dev/null 2>&1; then
    log "เชื่อมต่อ Cloud SQL สำเร็จ!"
else
    err "ไม่สามารถเชื่อมต่อ Cloud SQL ได้"
    echo ""
    echo "  ตรวจสอบ:"
    echo "  1. DB_HOST, DB_PASSWORD ในไฟล์ .env ถูกต้อง?"
    echo "  2. Cloud SQL authorize VM IP แล้ว?"
    echo "     gcloud sql instances patch customsguard-db --authorized-networks=\$(curl -s ifconfig.me)/32"
    echo "  3. Cloud SQL กำลัง running อยู่?"
    echo "     gcloud sql instances describe customsguard-db --format='value(state)'"
    echo ""
    warn "ข้ามไปก่อน — แก้ connection แล้วรัน step 5 ใหม่"
fi

# ── Step 6: Enable pgvector + Run migrations ─────────────────
echo ""
echo "── Step 6: เปิด pgvector + รัน migrations ─────"

PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "
    CREATE EXTENSION IF NOT EXISTS vector;
" 2>/dev/null && log "pgvector extension เปิดแล้ว" || warn "ไม่สามารถเปิด pgvector — อาจเปิดอยู่แล้ว"

# Run Flyway migrations via SQL files directly
echo "  รัน migrations..."
MIGRATION_DIR="$WORK_DIR/backend-core/feature-customsguard/src/main/resources/db/features/customsguard"

if [ -d "$MIGRATION_DIR" ]; then
    for sql_file in $(ls "$MIGRATION_DIR"/V*.sql 2>/dev/null | sort); do
        filename=$(basename "$sql_file")
        echo "  รัน $filename..."
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" \
            -f "$sql_file" 2>/dev/null || warn "  $filename — อาจรันไปแล้ว (OK)"
    done
    log "Migrations เสร็จ"
else
    warn "ไม่พบ migration files — ถ้า repo ไม่ได้ clone เต็ม ต้อง copy มาเอง"
fi

# Also run core migrations if available
CORE_MIGRATION_DIR="$WORK_DIR/backend-core/platform-core/src/main/resources/db/migration"
if [ -d "$CORE_MIGRATION_DIR" ]; then
    echo "  รัน core migrations..."
    for sql_file in $(ls "$CORE_MIGRATION_DIR"/V*.sql 2>/dev/null | sort); do
        filename=$(basename "$sql_file")
        PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" \
            -f "$sql_file" 2>/dev/null || true
    done
fi

# ── Step 7: Verify tables ────────────────────────────────────
echo ""
echo "── Step 7: ตรวจสอบ tables ─────────────────────"

PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name LIKE 'cg_%' OR table_name = '_pipeline_state'
    ORDER BY table_name;
"

# ── Step 8: Authenticate with GCP ────────────────────────────
echo ""
echo "── Step 8: GCP Authentication ─────────────────"

# VM ใช้ service account อยู่แล้ว (--scopes=cloud-platform)
# แต่ Vertex AI SDK ต้อง auth
if gcloud auth application-default print-access-token > /dev/null 2>&1; then
    log "GCP auth พร้อมแล้ว"
else
    echo "  ต้อง login สำหรับ Vertex AI:"
    gcloud auth application-default login
fi

# ── Step 9: Create data directories ──────────────────────────
echo ""
echo "── Step 9: สร้าง data directories ─────────────"

mkdir -p data/raw/{hs-codes,customs-pdfs,ecs-regulations,fta-data}
mkdir -p data/processed
mkdir -p data/dumps
log "Data directories พร้อม"

# ── Summary ───────────────────────────────────────────────────
echo ""
echo "=============================================="
echo "  VM Setup เสร็จสมบูรณ์!"
echo "=============================================="
echo ""
echo "  Working directory: $(pwd)"
echo "  Python: $(python3 --version)"
echo "  venv: $(which python)"
echo ""
echo "── วิธีเริ่มรัน Pipeline ──"
echo ""
echo "  cd $WORK_DIR/data-pipeline"
echo "  source venv/bin/activate"
echo ""
echo "  # สัปดาห์ 1: ดาวน์โหลด + HS Codes"
echo "  python 00_collect_raw_data.py"
echo "  python 01_parse_hs_codes_csv.py"
echo "  python 02_extract_hs_from_pdf.py"
echo "  python 03_embed_hs_codes.py"
echo ""
echo "── ดู progress ──"
echo ""
echo "  PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c \\"
echo "    \"SELECT pipeline_name, status, COUNT(*) FROM _pipeline_state GROUP BY 1,2 ORDER BY 1,2\""
echo ""
echo "── Tips ──"
echo ""
echo "  • ถ้าหลุด SSH → เข้ามาใหม่ แล้ว:"
echo "    cd ~/aiservice/data-pipeline && source venv/bin/activate"
echo "  • ใช้ tmux หรือ screen เพื่อให้ script รันต่อหลังปิด SSH:"
echo "    tmux new -s pipeline"
echo "    python 00_collect_raw_data.py"
echo "    (กด Ctrl+B แล้ว D เพื่อออกจาก tmux)"
echo "    (กลับมา: tmux attach -t pipeline)"
echo ""
