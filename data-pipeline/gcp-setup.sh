#!/bin/bash
# =============================================================
#  GCP Setup Script — CustomsGuard Data Pipeline
#
#  สร้าง Cloud SQL + VM ให้อัตโนมัติ
#  รันจาก Cloud Shell (shell.cloud.google.com)
#
#  Usage:
#    chmod +x gcp-setup.sh
#    ./gcp-setup.sh
# =============================================================

set -euo pipefail

# ── Configuration (แก้ตรงนี้ถ้าต้องการ) ────────────────────────
PROJECT_ID="${GCP_PROJECT_ID:-}"
REGION="us-central1"
ZONE="us-central1-a"

# Cloud SQL
SQL_INSTANCE_NAME="customsguard-db"
SQL_TIER="db-f1-micro"       # เล็กสุด ~$9/เดือน (scale up สัปดาห์ 4)
SQL_DB_NAME="ai_saas_db"
SQL_DB_PASSWORD="CustomsGuard2026!"  # เปลี่ยนได้

# Compute Engine VM
VM_NAME="customsguard-pipeline"
VM_TYPE="e2-small"           # 2 vCPU, 2 GB RAM — $0.02/hr
VM_DISK_SIZE="30"            # GB (เก็บ PDF + raw data)

# GCS Buckets
BUCKET_RAW="${PROJECT_ID}-customsguard-raw"
BUCKET_PROCESSED="${PROJECT_ID}-customsguard-processed"

# ── Colors ──────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; }

# ── Step 0: Verify Project ─────────────────────────────────────
echo ""
echo "=============================================="
echo "  CustomsGuard GCP Setup"
echo "=============================================="
echo ""

if [ -z "$PROJECT_ID" ]; then
    PROJECT_ID=$(gcloud config get-value project 2>/dev/null || true)
fi

if [ -z "$PROJECT_ID" ]; then
    err "ไม่พบ GCP Project ID"
    echo "  วิธีแก้: export GCP_PROJECT_ID=your-project-id"
    echo "  หรือ:  gcloud config set project your-project-id"
    exit 1
fi

echo "Project:  $PROJECT_ID"
echo "Region:   $REGION"
echo "Zone:     $ZONE"
echo ""
read -p "ถูกต้องใช่ไหม? [y/N] " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
    echo "ยกเลิก"
    exit 0
fi

gcloud config set project "$PROJECT_ID"

# ── Step 1: Enable APIs ────────────────────────────────────────
echo ""
echo "── Step 1: เปิด APIs ──────────────────────────"

APIS=(
    "sqladmin.googleapis.com"          # Cloud SQL
    "compute.googleapis.com"           # Compute Engine
    "aiplatform.googleapis.com"        # Vertex AI
    "storage.googleapis.com"           # Cloud Storage
)

for api in "${APIS[@]}"; do
    echo "  เปิด $api..."
    gcloud services enable "$api" --quiet
done
log "APIs เปิดหมดแล้ว"

# ── Step 2: Create Cloud SQL ───────────────────────────────────
echo ""
echo "── Step 2: สร้าง Cloud SQL PostgreSQL ─────────"

# Check if instance exists
if gcloud sql instances describe "$SQL_INSTANCE_NAME" --quiet 2>/dev/null; then
    warn "Cloud SQL '$SQL_INSTANCE_NAME' มีอยู่แล้ว — ข้าม"
else
    echo "  กำลังสร้าง Cloud SQL instance (ใช้เวลา 5-10 นาที)..."
    gcloud sql instances create "$SQL_INSTANCE_NAME" \
        --database-version=POSTGRES_16 \
        --tier="$SQL_TIER" \
        --edition=ENTERPRISE \
        --region="$REGION" \
        --storage-size=10 \
        --storage-auto-increase \
        --database-flags="cloudsql.enable_pgvector=on" \
        --availability-type=zonal \
        --quiet

    log "Cloud SQL instance สร้างเสร็จ"

    # Set password
    gcloud sql users set-password postgres \
        --instance="$SQL_INSTANCE_NAME" \
        --password="$SQL_DB_PASSWORD" \
        --quiet

    # Create database
    gcloud sql databases create "$SQL_DB_NAME" \
        --instance="$SQL_INSTANCE_NAME" \
        --quiet

    log "Database '$SQL_DB_NAME' สร้างเสร็จ"
fi

# Get Cloud SQL private IP
SQL_IP=$(gcloud sql instances describe "$SQL_INSTANCE_NAME" \
    --format="value(ipAddresses[0].ipAddress)" 2>/dev/null || echo "")

if [ -z "$SQL_IP" ]; then
    # Try private IP
    SQL_IP=$(gcloud sql instances describe "$SQL_INSTANCE_NAME" \
        --format="value(ipAddresses.filter(type=PRIVATE).ipAddress)" 2>/dev/null || echo "pending")
fi

echo "  Cloud SQL IP: $SQL_IP"

# ── Step 3: Enable pgvector extension ──────────────────────────
echo ""
echo "── Step 3: เปิด pgvector extension ────────────"

# We'll do this from the VM later, but try via gcloud sql connect
warn "pgvector จะถูกเปิดตอน run vm-setup.sh บน VM"

# ── Step 4: Create GCS Buckets ─────────────────────────────────
echo ""
echo "── Step 4: สร้าง Cloud Storage Buckets ────────"

for bucket in "$BUCKET_RAW" "$BUCKET_PROCESSED"; do
    if gcloud storage buckets describe "gs://$bucket" --quiet 2>/dev/null; then
        warn "Bucket '$bucket' มีอยู่แล้ว — ข้าม"
    else
        gcloud storage buckets create "gs://$bucket" \
            --location="$REGION" \
            --uniform-bucket-level-access \
            --quiet
        log "Bucket '$bucket' สร้างเสร็จ"
    fi
done

# ── Step 5: Create Compute Engine VM ──────────────────────────
echo ""
echo "── Step 5: สร้าง VM ──────────────────────────"

if gcloud compute instances describe "$VM_NAME" --zone="$ZONE" --quiet 2>/dev/null; then
    warn "VM '$VM_NAME' มีอยู่แล้ว — ข้าม"
else
    echo "  กำลังสร้าง VM (ใช้เวลา 1-2 นาที)..."
    gcloud compute instances create "$VM_NAME" \
        --zone="$ZONE" \
        --machine-type="$VM_TYPE" \
        --image-family=ubuntu-2404-lts-amd64 \
        --image-project=ubuntu-os-cloud \
        --boot-disk-size="${VM_DISK_SIZE}GB" \
        --scopes=cloud-platform \
        --metadata=startup-script='#!/bin/bash
echo "VM is ready" > /tmp/vm-ready
' \
        --quiet

    log "VM '$VM_NAME' สร้างเสร็จ"
fi

VM_IP=$(gcloud compute instances describe "$VM_NAME" --zone="$ZONE" \
    --format="value(networkInterfaces[0].accessConfigs[0].natIP)" 2>/dev/null || echo "")
VM_INTERNAL_IP=$(gcloud compute instances describe "$VM_NAME" --zone="$ZONE" \
    --format="value(networkInterfaces[0].networkIP)" 2>/dev/null || echo "")

echo "  VM External IP: $VM_IP"
echo "  VM Internal IP: $VM_INTERNAL_IP"

# ── Step 6: Allow VM to access Cloud SQL ──────────────────────
echo ""
echo "── Step 6: อนุญาต VM เข้าถึง Cloud SQL ────────"

# If Cloud SQL has public IP, authorize VM's IP
# If private IP, they're already on the same network
gcloud sql instances patch "$SQL_INSTANCE_NAME" \
    --authorized-networks="$VM_IP/32" \
    --quiet 2>/dev/null || warn "ใช้ private IP — ไม่ต้อง authorize"

# Also authorize Cloud Shell IP for debugging
SHELL_IP=$(curl -s ifconfig.me 2>/dev/null || echo "")
if [ -n "$SHELL_IP" ]; then
    gcloud sql instances patch "$SQL_INSTANCE_NAME" \
        --authorized-networks="$VM_IP/32,$SHELL_IP/32" \
        --quiet 2>/dev/null || true
fi

log "Network configured"

# ── Step 7: Request Vertex AI Quota ───────────────────────────
echo ""
echo "── Step 7: Vertex AI Quota ────────────────────"
warn "ตรวจสอบ quota ที่:"
echo "  https://console.cloud.google.com/iam-admin/quotas?project=$PROJECT_ID"
echo "  ค้นหา: generate_content_requests_per_minute"
echo "  ถ้าน้อยกว่า 60 RPM → กด EDIT QUOTAS ขอเพิ่ม"

# ── Step 8: Create .env file ──────────────────────────────────
echo ""
echo "── Step 8: สร้างไฟล์ .env ─────────────────────"

# Re-fetch SQL IP (might have changed if we added public IP)
SQL_IP=$(gcloud sql instances describe "$SQL_INSTANCE_NAME" \
    --format="value(ipAddresses[0].ipAddress)" 2>/dev/null || echo "$SQL_IP")

ENV_CONTENT="# GCP
GCP_PROJECT_ID=$PROJECT_ID
GCP_REGION=$REGION
GCS_RAW_BUCKET=$BUCKET_RAW
GCS_PROCESSED_BUCKET=$BUCKET_PROCESSED

# Database (Cloud SQL)
DB_HOST=$SQL_IP
DB_PORT=5432
DB_NAME=$SQL_DB_NAME
DB_USER=postgres
DB_PASSWORD=$SQL_DB_PASSWORD

# Google AI Studio (embedding free tier)
GEMINI_API_KEY=__ใส่_API_KEY_ตรงนี้__"

echo "$ENV_CONTENT" > /tmp/pipeline.env
log "ไฟล์ .env สร้างที่ /tmp/pipeline.env"

# ── Summary ───────────────────────────────────────────────────
echo ""
echo "=============================================="
echo "  สร้างเสร็จหมดแล้ว!"
echo "=============================================="
echo ""
echo "  Cloud SQL:  $SQL_INSTANCE_NAME ($SQL_IP)"
echo "  VM:         $VM_NAME ($VM_IP)"
echo "  Buckets:    $BUCKET_RAW, $BUCKET_PROCESSED"
echo ""
echo "── ขั้นตอนถัดไป ──"
echo ""
echo "  1. SSH เข้า VM:"
echo "     gcloud compute ssh $VM_NAME --zone=$ZONE"
echo ""
echo "  2. บน VM ให้รัน vm-setup.sh:"
echo "     (ดู instructions ที่แสดงหลัง SSH เข้าไป)"
echo ""
echo "  3. อย่าลืมใส่ GEMINI_API_KEY ในไฟล์ .env"
echo ""
echo "── ค่าใช้จ่ายโดยประมาณ ──"
echo "  Cloud SQL db-f1-micro: ~\$9/เดือน"
echo "  VM e2-small:           ~\$15/เดือน"
echo "  Storage:               ~\$1/เดือน"
echo "  รวม infra:             ~\$25/เดือน"
echo ""
