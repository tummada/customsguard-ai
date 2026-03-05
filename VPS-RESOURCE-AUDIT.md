# VPS Resource Audit — VOLLOS Production

**VPS Spec:** 2 CPU / 8 GB RAM / 100 GB Disk / 8 GB Swap
**วันที่ตรวจ:** 2026-03-04
**SSL:** Cloudflare Origin Certificate (ไม่ใช้ certbot)

---

## Resource Budget (หลังแก้ไข)

| Service | CPU | RAM | Health Check |
|---------|-----|-----|-------------|
| PostgreSQL | 0.50 | 2048M | pg_isready |
| Redis | 0.15 | 512M | redis-cli ping |
| MinIO | 0.15 | 256M | mc ready |
| Backend (JVM) | 0.60 | 1024M | /actuator/health |
| Marketing | 0.10 | 256M | — |
| Nginx | 0.10 | 128M | depends_on |
| DB-Backup | 0.10 | 256M | — |
| **รวม** | **1.70** | **4.5G** | — |
| **เหลือ** | **0.30** | **3.5G** | OS + cache |

CPU headroom 15% → ผ่าน The 1.9 Rule

## สิ่งที่แก้ไข (5 Fixes)

### Fix 1: Backend JVM (CRITICAL)
- **ไฟล์:** `backend-core/Dockerfile.jvm`
- ZGC → SerialGC (ประหยัด CPU สำหรับ ≤2 cores)
- Heap: `-Xms256m -Xmx1024m` → `-Xms512m -Xmx768m`
- Container: CPU 0.8→0.6, RAM 1536M→1024M

### Fix 2: ลบ Certbot (HIGH)
- **ไฟล์:** `docker-compose.prod.yml`
- ลบ certbot service + volumes (ใช้ Cloudflare SSL แทน)

### Fix 3: HikariCP Pool (HIGH)
- **ไฟล์:** `backend-core/platform-app/src/main/resources/application.yml`
- `maximum-pool-size`: 15 → 8 (เหมาะกับ 2 CPU)

### Fix 4: Compress Backup (MEDIUM)
- **ไฟล์:** `docker-compose.prod.yml`
- `pg_dump -Fc > .dump` → `pg_dump -Fc | gzip > .dump.gz`
- ประหยัด disk ~5-10x

### Fix 5: Actuator Health (LOW)
- **ไฟล์:** `backend-core/platform-app/build.gradle.kts`
- เพิ่ม `spring-boot-starter-actuator`
- Healthcheck: POST `/v1/auth/dev-token` → GET `/actuator/health`

## Disk Budget (100 GB)

| ใช้งาน | ประมาณ |
|--------|--------|
| OS + Docker images | ~10 GB |
| PostgreSQL data | ~5-20 GB |
| MinIO (PDF uploads) | ~10-30 GB |
| DB Backups (compressed) | ~2-5 GB |
| Swap | 8 GB |
| Logs | ~0.5 GB |
| **รวม** | **~35-73 GB** |
| **เหลือ** | **~27-65 GB** |

ตั้ง disk alert ที่ 80% + cron `docker system prune` ทุกอาทิตย์

## Capacity Estimate

| ระดับ | จำนวน | เงื่อนไข |
|-------|-------|----------|
| Concurrent active users | 30-50 คน | ใช้งานพร้อมกัน |
| Concurrent heavy ops | 5-10 คน | PDF scan / RAG search |
| Registered users | 300-1,000 คน | 5-10% online พร้อมกัน |

**Bottleneck หลัก:** HikariCP 8 connections, Backend 0.6 CPU, SerialGC pause

### Redis Cache (HS Code Lookup) — DONE

| รายละเอียด | ค่า |
|------------|-----|
| Library | spring-boot-starter-data-redis (Lettuce pool) |
| Namespace | `vollos:cg:` prefix ป้องกัน key collision |
| Cache: `hs-lookup` | TTL 24h — HS+FTA+LPI รวมเป็น DTO เดียว |
| Cache: `hs-codes` | TTL 24h |
| Cache: `fta-rates` | TTL 1h |
| Cache: `lpi-controls` | TTL 4h |
| Fail-silent | Redis ล่ม → log warn + fallback DB (ไม่พัง API) |
| Eviction | seed/embed → evict `hs-lookup` + `hs-codes` ทั้งหมด |
| Self-injection | `@Lazy` self-proxy ให้ batchLookup เรียก lookupSingleCode ผ่าน cache |

**ผลที่คาดหวัง (10 codes):**
- Cache miss: 30 queries → ~1,500ms
- Cache hit: 0 queries → ~20ms (ลด DB load ~90%)

### Scale-up Path
1. ~~เพิ่ม Redis cache ให้ HS code lookup → ลดโหลด DB~~ **DONE**
2. อัพ VPS เป็น 4 CPU / 16 GB → รับ 2-3 เท่า
3. แยก PostgreSQL ไป managed DB → backend ได้ CPU เต็ม

## VPS Setup (ทำ manual บน server)

```bash
# ตรวจ swap
free -h  # ต้องเห็น 8G swap

# swappiness ต่ำ (ใช้ swap เฉพาะฉุกเฉิน)
echo "vm.swappiness=10" >> /etc/sysctl.conf
sysctl -p

# weekly Docker cleanup (crontab -e)
0 3 * * 0 docker system prune -f >> /var/log/docker-prune.log 2>&1
```

## Verification Commands

```bash
docker compose -f docker-compose.prod.yml config   # ตรวจ YAML
docker stats                                         # ดู resource usage
free -h                                              # ตรวจ swap
df -h                                                # ตรวจ disk
```
