---
name: review-infra
description: ตรวจ Docker/resource config ตามข้อจำกัด 2 CPU / 8 GB RAM
user_invocable: true
argument: "<file-path> — ชื่อไฟล์ docker-compose (default: docker-compose.yml)"
---

# /review-infra — Infrastructure Review

ตรวจสอบ Docker Compose และ infrastructure config ตามข้อจำกัดทรัพยากร VOLLOS (2 CPU / 8 GB RAM)

## Execution Steps

1. **รับ input:** อ่าน `$ARGUMENTS` — ถ้าไม่ระบุ ใช้ `docker-compose.yml`
2. **Read ไฟล์** docker-compose ที่ระบุ
3. **คำนวณ resource totals** แล้วตรวจ checklist
4. **อ่านไฟล์เสริม** ถ้ามี: nginx config, init-db.sh, Dockerfile

## Resource Budget (2 CPU / 8 GB RAM)

| Service | CPU Target | RAM Target | Priority |
|---------|-----------|-----------|----------|
| PostgreSQL | 0.4 | 1.5 GB | OOM -500 |
| Redis | 0.2 | 512 MB | OOM -500 |
| Java Backend | 0.6 | 1.0 GB | OOM 0 |
| n8n (total) | 0.5 | 2.0 GB | OOM 500 |
| Nginx | 0.1 | 256 MB | OOM -1000 |
| System Reserve | 0.2 | ~2.7 GB | — |
| **Total** | **≤ 1.9** | **≤ 8 GB** | — |

## Checklist

| # | Rule | ตรวจอะไร | Severity |
|---|------|---------|----------|
| 1 | **The 1.9 Rule** | ยอดรวม `cpus` ทุก service ต้อง ≤ 1.9 | CRITICAL |
| 2 | **RAM Total** | ยอดรวม `mem_limit` ทุก service ต้อง ≤ 8 GB (รวม system reserve) | CRITICAL |
| 3 | **CPU/RAM Limits Set** | ทุก service ต้องมี `deploy.resources.limits` หรือ `cpus` + `mem_limit` | HIGH |
| 4 | **Health Checks** | ทุก service ต้องมี `healthcheck` config | HIGH |
| 5 | **Restart Policy** | ทุก service ต้องมี `restart: unless-stopped` หรือ `always` | MEDIUM |
| 6 | **Logging Config** | ทุก service ต้องมี `logging` → `max-size: 10m`, `max-file: 3` | MEDIUM |
| 7 | **No Privileged** | ห้ามใช้ `privileged: true` | HIGH |
| 8 | **No Host Network** | ห้ามใช้ `network_mode: host` ใน production | MEDIUM |
| 9 | **Secrets Management** | ห้ามมี plain-text password/key ใน docker-compose (ต้องใช้ `${VAR}`) | CRITICAL |
| 10 | **Shadow Build** | ห้ามมี `RUN ./gradlew` หรือ `nativeCompile` ใน Dockerfile ของ production | HIGH |
| 11 | **shm_size** | PostgreSQL ต้องมี `shm_size` (recommend ≥ 256MB) | MEDIUM |
| 12 | **Volume Mounts** | DB data ต้อง mount เป็น named volume (ไม่ใช่ bind mount ที่หายง่าย) | MEDIUM |

## Output Format

```
## 📋 Infrastructure Review: <filename>

### Resource Summary
| Service | CPU | RAM | Health | Restart | Logging |
|---------|-----|-----|--------|---------|---------|
| postgres | 0.4 | 1.5G | ✅ | ✅ | ✅ |
| redis | 0.2 | 512M | ✅ | ✅ | ❌ |
| ... | ... | ... | ... | ... | ... |
| **Total** | **1.7** | **5.8G** | — | — | — |

### Budget Check
- CPU: 1.7 / 1.9 ✅ (headroom: 0.2)
- RAM: 5.8G / 8.0G ✅ (system reserve: 2.2G)

### Checklist Results
| # | Rule | Status | Note |
|---|------|--------|------|
| 1 | The 1.9 Rule | ✅ PASS | Total: 1.7 |
| ... | ... | ... | ... |

### Critical Findings
- ...

### Recommendations
- ...
```

## Important Notes
- docker-compose.dev.yml → ไม่ต้องเข้มงวดเรื่อง resource limits (dev mode)
- ถ้าไม่พบ resource limits → ถือว่า FAIL (unlimited = อันตรายบน 8GB)
- คำนวณ RAM เป็น bytes แล้วแปลงเป็น GB เพื่อความแม่นยำ
