#!/bin/bash
# ==============================================================
# VOLLOS — First-time SSL Setup
# Usage: ./infra/scripts/init-ssl.sh
# ==============================================================
set -e

DOMAIN=${DOMAIN:-vollos.ai}
EMAIL=${EMAIL:-admin@vollos.ai}
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"

echo "=== VOLLOS SSL Init for ${DOMAIN} ==="

# 1. Create directories
mkdir -p data/certbot/conf data/certbot/www data/backups

# 2. Use initial nginx config (HTTP only, for cert challenge)
echo "[1/5] Setting up initial HTTP-only nginx config..."
cp infra/nginx/conf.d/initial.conf infra/nginx/conf.d/default.conf
rm -f infra/nginx/conf.d/vollos.conf.active 2>/dev/null

# 3. Start services (HTTP only)
echo "[2/5] Starting services..."
docker compose -f $COMPOSE_FILE --env-file $ENV_FILE up -d postgres redis minio minio-init backend nginx

echo "[3/5] Waiting for backend to be healthy..."
for i in $(seq 1 30); do
    if docker compose -f $COMPOSE_FILE --env-file $ENV_FILE exec -T backend curl -sf http://localhost:8080/v1/auth/dev-token -X POST > /dev/null 2>&1; then
        echo "Backend ready!"
        break
    fi
    echo "  waiting... ($i/30)"
    sleep 5
done

# 4. Request SSL certificate
echo "[4/5] Requesting SSL certificate for ${DOMAIN}..."
docker compose -f $COMPOSE_FILE --env-file $ENV_FILE run --rm certbot \
    certbot certonly --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN \
    -d api.$DOMAIN

# 5. Switch to full SSL nginx config
echo "[5/5] Switching to SSL nginx config..."
cp infra/nginx/conf.d/vollos.conf infra/nginx/conf.d/default.conf
docker compose -f $COMPOSE_FILE --env-file $ENV_FILE restart nginx

# 6. Start remaining services
docker compose -f $COMPOSE_FILE --env-file $ENV_FILE up -d

echo ""
echo "=== DONE ==="
echo "  https://${DOMAIN}        — Marketing site"
echo "  https://api.${DOMAIN}    — Backend API"
echo ""
echo "Next: Seed data with:"
echo "  curl -X POST https://api.${DOMAIN}/v1/customsguard/hs-codes/seed -H 'X-Tenant-ID: a0000000-0000-0000-0000-000000000001'"
