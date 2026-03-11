# Scan Patterns Reference

Grep/Glob patterns สำหรับตรวจสอบแต่ละ category
ใช้โดย SKILL.md — ห้ามรัน pattern เดิมซ้ำ ถ้าไม่พบผลในรอบแรก

---

## File Discovery Patterns

### Project Structure Detection
```
GLOB สำรวจโครงสร้าง:
- **/*.java                → Java source files
- **/*.py                  → Python source files
- **/*.ts, **/*.tsx         → TypeScript/React files
- **/*.js, **/*.jsx         → JavaScript files
- **/application*.yml       → Spring Boot config
- **/application*.properties → Spring Boot config
- **/pom.xml, **/build.gradle → Java dependencies
- **/package.json            → Node.js dependencies
- **/requirements*.txt       → Python dependencies
- **/pyproject.toml          → Python project config
- **/docker-compose*.yml     → Docker Compose
- **/.gitlab-ci.yml          → GitLab CI
- **/.gitignore              → Git ignore rules
- **/nginx*.conf             → Nginx config
- **/*.env*                  → Environment files (ห้ามอ่านเนื้อหา ดูแค่ว่ามีใน .gitignore)
```

### Exclusion Patterns
```
SKIP ทุกครั้ง:
- node_modules/
- venv/ / .venv/
- .git/
- __pycache__/
- build/ / dist/ / target/
- .gradle/ / .mvn/
- .next/
- *.min.js / *.min.css
- *.lock (package-lock.json, yarn.lock — ตรวจ package.json แทน)
```

---

## Security Scan Patterns

### Secrets Detection
```
GREP patterns (case-insensitive):
1. password\s*[:=]\s*["'][^$\{]     → hardcoded password (exclude env vars)
2. (api[_-]?key|apikey)\s*[:=]\s*["'][A-Za-z0-9]  → API key
3. (secret|token)\s*[:=]\s*["'][A-Za-z0-9]         → secret/token
4. -----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY              → private key
5. Bearer\s+[A-Za-z0-9\-._~+/]{20,}                → hardcoded bearer token
6. (jdbc|mongodb|redis|amqp)://[^$\{].*@            → connection string with credentials
7. AWS[A-Z0-9]{16,}                                 → AWS access key pattern

CONTEXT: ตรวจ ±3 บรรทัดรอบ match เพื่อดูว่าเป็น test/mock หรือไม่
FALSE POSITIVE FILTER: ข้ามถ้า:
- อยู่ใน test/ หรือ *Test.java / *test.py / *.test.ts
- ค่าเป็น "changeme" / "test" / "mock" / "dummy" / "example"
- เป็น comment ที่อธิบาย format
```

### SQL Injection Detection
```
JAVA GREP:
1. "\bSELECT\b.*"\s*\+\s*\w+        → string concat in SQL
2. "query\(.*(\"|\').*\+\s*"         → JdbcTemplate with concat
3. @Query.*\+\s*                      → @Query with concat
4. createNativeQuery\(.*\+            → native query with concat

PYTHON GREP:
1. execute\(.*f["']                   → f-string in execute
2. execute\(.*\.format\(              → .format() in execute
3. execute\(.*%\s                     → % formatting in execute
```

### Auth Check Patterns
```
JAVA:
1. หา @RestController classes
2. ตรวจ SecurityFilterChain config → list permitAll() paths
3. เทียบ: controller paths ที่ไม่อยู่ใน security config
4. ตรวจ @PreAuthorize / @Secured annotations

GREP:
- @RestController                     → list all controllers
- permitAll\(\)                        → find open paths
- @PreAuthorize|@Secured              → find secured methods
- .csrf().disable()                   → CSRF disabled
- .cors().configurationSource         → CORS config
```

---

## Logic Bug Scan Patterns

### AI Hallucination Risk
```
GREP:
1. generateContent|sendMessage|gemini → Gemini API calls
2. hsCode|hs_code|tariff|classify     → HS code related
3. embedding|vectorSearch|similarity   → RAG/vector operations
4. confidence|score|threshold          → validation checks

TRACE FLOW:
- จาก Gemini call → ดูว่า result ถูก:
  a) Cross-check กับ DB/vector store? (มี repository/query call ต่อ?)
  b) มี confidence threshold? (if score > X)
  c) มี fallback? (else → manual review)
  d) ถูกใช้ตรง ๆ? → FLAG
```

### Race Condition Detection
```
JAVA:
1. @Async\s+.*void                    → async method with shared state risk
2. CompletableFuture                   → async chain
3. synchronized|Lock|Atomic           → concurrency control (GOOD)
4. @Transactional.*SERIALIZABLE       → proper isolation (GOOD)

REDIS:
1. redisTemplate.opsForValue\(\).get  → check if followed by .set (non-atomic)
2. StringRedisTemplate                → same check
3. Lua script / MULTI-EXEC            → atomic (GOOD)
```

---

## Code Quality Scan Patterns

### Dead Code
```
JAVA:
1. import .*\.\*;                     → wildcard import (flag)
2. //.*\n.*//.*\n.*//                 → 3+ consecutive comment lines (possible dead code)

REACT/TS:
1. import.*from.*(?!.*used)           → need cross-ref with usage
2. export (default )?function \w+     → check if imported elsewhere

PYTHON:
1. ^import |^from .* import           → check usage below
```

### Error Handling Anti-patterns
```
JAVA:
1. catch\s*\([^)]+\)\s*\{\s*\}        → empty catch block
2. catch\s*\(Exception\s+\w+\)\s*\{[^}]*log\.[^}]*\}\s*$  → log-only catch
3. @ExceptionHandler.*200             → wrong status code

PYTHON:
1. except:\s*pass                     → bare except pass
2. except\s+Exception.*:\s*pass       → exception pass
3. except.*:\s*$                      → empty except

TYPESCRIPT/JS:
1. \.catch\(\s*\(\)\s*=>\s*\{\s*\}\)  → empty catch
2. catch\s*\(.*\)\s*\{\s*\}           → empty catch block
```

### TODO/FIXME Scanner
```
GREP: (TODO|FIXME|HACK|XXX|WORKAROUND|TEMP[^LATE]|TEMPORARY)
- แสดงทั้งหมดพร้อม file:line
- ใช้ git blame หาอายุ (optional ถ้ามี git history)
```

---

## Architecture Smell Patterns

### Module Boundary Violations
```
PROJECT STRUCTURE:
backend-core/
  platform-core/    → shared kernel (อนุญาตให้ทุก module depend ได้)
  platform-app/     → application bootstrap
  feature-customsguard/ → feature module

VIOLATION PATTERNS:
1. platform-core imports from feature-* → VIOLATION (core → feature)
2. feature-A imports feature-B internal class → VIOLATION (cross-feature)
3. feature-* imports platform-app internal → VIOLATION (feature → app)

ALLOWED:
1. feature-* imports platform-core public API → OK
2. platform-app imports feature-* for bootstrap → OK
3. Any module imports Java stdlib / Spring / external lib → OK

GREP:
- import.*feature.*internal            → potential violation
- Check package visibility: public interface vs internal class
```

### Docker Compose Security
```
GREP in docker-compose*.yml:
1. environment:\s*\n\s+-\s+\w+=(?!\$\{)  → hardcoded env values
2. ports:\s*\n\s+-\s+"?(\d+):\d+         → exposed ports
3. image:.*:latest                         → unpinned image
4. volumes:.*(/etc|/var|/root|\.ssh)       → sensitive mount
```

### GitLab CI Security
```
GREP in .gitlab-ci.yml:
1. variables:\s*\n\s+\w+:\s*["']?[^$]    → hardcoded variables
2. ssh|scp|rsync.*password               → credentials in commands
3. docker build.*--build-arg.*=(?!\$)     → hardcoded build args
4. artifacts:.*expire_in:?\s*$            → no expiry on artifacts
```

---

## Domain Compliance Scan Patterns

### Data Source Detection
```
GREP (หาแหล่งข้อมูลอัตราแลกเปลี่ยน):
1. customs\.go\.th                        → ✅ แหล่งที่ถูกต้อง
2. bot\.or\.th|bankofthailand             → ❌ แหล่งผิด (BOT Mid Rate)
3. exchange[_-]?rate|exchangeRate         → หาจุดใช้งานอัตราแลกเปลี่ยน
4. mid[_-]?rate|midRate                   → ❌ ศุลกากรไม่ใช้อัตรากลาง

GREP (หา FTA Form references):
5. form.*fta|fta.*form|Form\s+[A-Z]      → ชื่อ FTA Form
6. tafta|TAFTA|Form\s+AAT|Form\s+TAL     → ❌ ชื่อผิดสำหรับ Thailand-Australia FTA
7. acfta|ACFTA|jtepa|JTEPA|rcep|RCEP     → FTA agreements
8. atiga|ATIGA|akfta|AKFTA               → ASEAN/Korea FTA

ข้อควรระวัง: cross-check ชื่อที่พบกับตาราง FTA Form ใน domain-knowledge.md ส่วน 5
```

### Calculation Logic Detection
```
GREP (หา tax/duty calculation):
1. vat|VAT|value.added.tax               → VAT calculation
2. duty|DUTY|import.duty|importDuty      → Import duty
3. cif|CIF|cost.insurance.freight        → CIF valuation
4. excise|EXCISE|สรรพสามิต                → Excise tax
5. de.minimis|deMinimis|1500|threshold   → De Minimis check (ยกเลิกแล้ว 2026)
6. total.tax|totalTax|total.cost         → Total calculation

CHECK ถ้าพบ:
- VAT ต้องคิดจาก (CIF + Duty) × 7% ไม่ใช่แค่ CIF × 7%
- ถ้าไม่พบ VAT calculation เลย → CRITICAL
- ถ้าพบ de_minimis logic ที่ยกเว้น ≤1,500 → CRITICAL (กฎเปลี่ยน 2026)
```

### HS Code & Validation Detection
```
GREP (หา HS Code handling):
1. hs[_-]?code|hsCode|tariff[_-]?code    → HS Code fields
2. isValid|validate|@Pattern|regex        → Validation logic
3. \d{4}\.\d{2}                           → HS Code pattern ที่ถูกต้อง (DDDD.DD)
4. prefix|chapter|heading                 → HS Code hierarchy
5. lpi|LPI|license|permit|ใบอนุญาต        → สินค้าควบคุม

FORMAT CHECK:
- HS Code ต้องเป็น: ^\d{4}\.\d{2}(\.\d{2}){0,2}$
- LPI prefix ต้องเป็น 4 หลัก (chapter level)
- ตรวจ seed data: format consistent ทั้งระบบหรือไม่
```

### Weight & Unit Detection
```
GREP:
1. weight|WEIGHT|น้ำหนัก                   → Weight fields
2. kg|KG|kilogram|กิโลกรัม                  → Correct unit
3. unit|UNIT|หน่วย                          → Unit handling
4. net[_-]?weight|gross[_-]?weight         → Weight types
5. convert|conversion                      → Unit conversion

CHECK:
- Input field บังคับ KG หรือรับ free text
- มี unit dropdown/selector หรือไม่
- มี auto-convert (LB→KG, OZ→KG) หรือไม่
```

### Frontend-Backend Parity Detection
```
GREP (หา enum/type definitions):
1. enum.*declaration|declaration.*type     → Declaration types (Java)
2. IMPORT|EXPORT|TRANSIT|TRANSSHIPMENT     → Declaration values
3. type.*Declaration|DeclarationType       → TypeScript types

METHOD:
1. Glob: **/*enum*.java, **/*Type*.java    → Java enums
2. Glob: **/types/*.ts, **/types/index.ts  → TS type definitions
3. Compare: enum values ตรงกันหรือไม่

CRITICAL CHECK:
- Backend enum: มี TRANSIT/TRANSSHIPMENT ไหม
- Frontend type: มี TRANSIT/TRANSSHIPMENT ไหม
- ถ้า Backend มีแต่ Frontend ไม่มี → HIGH
```

### Data Freshness Detection
```
GREP:
1. @Scheduled|cron|fixedRate|fixedDelay   → Scheduled tasks (Java)
2. schedule|scheduler|periodic            → Scheduling patterns
3. sync|fetch|pull|update                 → Data sync operations
4. last[_-]?updated|synced[_-]?at         → Freshness tracking
5. seed|INSERT INTO|VALUES                → Static seed data

CHECK:
- ถ้ามี @Scheduled sync → ✅ (ตรวจว่า frequency เหมาะสม)
- ถ้ามีแต่ static INSERT → ❌ CRITICAL (ข้อมูลไม่อัปเดต)
- ถ้ามีทั้ง 2 → OK (seed เป็น initial, sync เป็น update)
```

### Export Rate Detection (NEW)
```
GREP:
1. export[_-]?rate|exportRate             → Export exchange rate
2. import[_-]?rate|importRate             → Import exchange rate
3. rate[_-]?type|rateType                 → Rate type distinction
4. SELLING|BUYING|selling|buying          → Buy/Sell rate

CHECK:
- ระบบแยก import rate กับ export rate หรือไม่
  → ถ้าใช้ rate เดียว = CRITICAL (อัตราขาเข้า ≠ ขาออก)
- ตรวจ ExchangeRateEntity มี field rateType หรือ importRate/exportRate
- Frontend แสดงอัตราที่ถูกต้องตามประเภทใบขน
```

---

## Supply Chain & AI/LLM Scan Patterns

### Dependency Pinning Detection
```
GREP:
1. implementation\(['"]                   → Java dependencies (check version pinned)
2. FROM\s+\w+:                           → Docker base image (check digest pin)
3. :latest                               → ❌ unpinned tag
4. sha256:                               → ✅ pinned to digest (GOOD)

GRADLE:
- ตรวจ build.gradle.kts → ทุก implementation() ต้องมี version number
- ตรวจ libs.versions.toml ถ้าใช้ version catalog

NPM:
- ตรวจ package-lock.json committed (git status)
- ตรวจ package.json → ห้ามใช้ * หรือ latest

PYTHON:
- ตรวจ requirements.txt → ทุก package ต้อง pin ==version
```

### AI/LLM Security Deep Scan
```
GREP (Prompt Injection):
1. system.*role|role.*system               → System prompt isolation check
2. content.*user.*input|userInput.*prompt  → User input in prompt
3. ChatGuardService|promptFilter|sanitize  → ✅ Injection filter (GOOD)
4. maxTokens|max_tokens|maxLength          → Output length limit

GREP (RAG Poisoning):
5. vectorStore|embeddingStore|pgvector     → Vector store operations
6. addDocuments|upsert|insertEmbedding     → Data ingestion points
7. source|sourceUrl|metadata               → Source attribution

GREP (Hallucination):
8. confidence|score|threshold              → Confidence check
9. fallback|default|unknown                → Fallback mechanism
10. crossCheck|validate|verify             → Ground truth validation

TRACE FLOW:
- User input → ChatGuardService → Prompt → Gemini → Output validation → Response
- ทุกจุดต้องมี guard: input filter → system prompt isolation → output validation
```

### Observability Scan Patterns
```
GREP:
1. logback|logstash|JsonLayout             → Structured logging config
2. MDC\.|traceId|requestId|correlationId  → Request correlation
3. actuator|/health|/prometheus            → Health/metrics endpoints
4. @Slf4j|LoggerFactory                   → Logger usage
5. metric|counter|gauge|timer              → Custom metrics

CHECK in application.yml:
- management.endpoints.web.exposure → health, prometheus
- logging.pattern → JSON format ใน production

CHECK in docker-compose:
- logging.driver: json-file (default OK)
- logging.options: max-size, max-file
```

### RBAC Scan Patterns
```
GREP:
1. @PreAuthorize|@Secured|hasRole          → Role-based method security
2. ROLE_ADMIN|ROLE_USER|ADMIN|USER         → Role definitions
3. UserEntity|userRole|role                → User-role mapping
4. SecurityFilterChain.*role               → URL-based role security
5. permitAll\(\)                           → Open endpoints (verify each)

METHOD:
1. List all @RestController endpoints
2. Cross-ref with SecurityFilterChain config
3. Flag admin-only operations that don't have role check
4. Flag permitAll endpoints that should be restricted
```

---

## Java & Spring Boot Scan Patterns

### Virtual Thread Safety
```
GREP:
1. synchronized\s                         → synchronized keyword
2. synchronized\s*\(                      → synchronized block
3. ReentrantLock|Lock\.lock               → proper alternative (GOOD)
4. @Async                                → async method (check context propagation)
5. CompletableFuture                     → async chain (check shared state)

CHECK:
- synchronized ใน @Service / @Repository class → CRITICAL
- synchronized ใน utility/helper → MEDIUM (less impact)
- ตรวจ ±5 บรรทัด ว่า synchronized ป้องกัน shared state จริงไหม
```

### UUID & ID Generation
```
GREP:
1. GenerationType\.AUTO                   → ❌ ห้าม
2. GenerationType\.IDENTITY               → ❌ ห้าม
3. GenerationType\.SEQUENCE               → ❌ ห้าม
4. @GeneratedValue                        → ตรวจ strategy
5. UuidCreator|Generators\.timeOrdered    → ✅ UUID v7 (GOOD)

CHECK:
- ทุก @Entity ต้องสร้าง ID จาก application layer
- ถ้าพบ AUTO/IDENTITY/SEQUENCE → CRITICAL
```

### HikariCP & Connection
```
GREP:
1. leak-detection|leakDetection          → leak detection config
2. maximum-pool|maximumPool              → pool size config
3. connection-timeout|connectionTimeout  → timeout config
4. hikari                                 → HikariCP config section

CHECK:
- leak-detection-threshold ต้องมี (แนะนำ 30000)
- maximum-pool-size ≤ 15 สำหรับ VPS 2 CPU
```

### Spring Boot Config
```
GREP:
1. Thread\.sleep                          → ❌ ห้ามใน production
2. -Xmx\d+                               → heap size
3. timeout-per-shutdown                   → graceful shutdown
4. afterburner|Afterburner               → ❌ ต้องใช้ Blackbird
5. blackbird|Blackbird                   → ✅ GraalVM compatible
```

---

## Database & Migration Scan Patterns

### RLS Policy Detection
```
GREP in db/migration/ and db/features/:
1. ROW LEVEL SECURITY                     → RLS declaration
2. ENABLE ROW LEVEL SECURITY             → enable command
3. FORCE ROW LEVEL SECURITY              → force command
4. CREATE POLICY                          → policy definition
5. current_setting\('app\.current_tenant  → tenant filter

METHOD:
- หา CREATE TABLE ทุกตัว → ตรวจว่ามี RLS policy ครบ
- หา ALTER TABLE ... ENABLE + FORCE ทั้งคู่
- ถ้า table มี tenant_id แต่ไม่มี RLS → CRITICAL
```

### Column Type Detection
```
GREP in migrations:
1. SERIAL|BIGSERIAL                       → ❌ ห้ามใช้
2. GENERATED.*IDENTITY                    → ❌ ห้ามใช้
3. \bTIMESTAMP\b(?!TZ|WITH)              → ❌ ต้องเป็น TIMESTAMPTZ
4. TIMESTAMPTZ                            → ✅ ถูกต้อง
5. tenant_id\s+UUID                       → ✅ tenant column

CHECK:
- ทุก date/time column ต้องเป็น TIMESTAMPTZ
- PK ต้องเป็น UUID ไม่ใช่ SERIAL
```

### Index Count
```
METHOD:
1. GREP: CREATE INDEX|CREATE UNIQUE INDEX → list ทั้งหมด
2. Group by table name
3. Count per table (รวม PK implicit)
4. Flag ถ้า > 5 per table

GREP for composite index:
- CREATE INDEX.*ON.*\(tenant_id,        → ✅ tenant_id first
- CREATE INDEX.*ON.*\(\w+,.*tenant_id   → ❌ tenant_id ไม่ใช่ first
```

---

## Infrastructure Scan Patterns

### Docker Compose Resources
```
GREP in docker-compose*.yml:
1. cpus:\s*['"]?(\d+\.?\d*)              → CPU limit per service
2. memory:\s*['"]?(\d+[MmGg])            → Memory limit per service
3. deploy:\s*\n\s*resources:             → resource block exists
4. healthcheck:                           → healthcheck exists
5. restart:\s*(unless-stopped|always)    → restart policy
6. max-size|max-file                     → logging config

METHOD:
- Sum all CPU limits → must ≤ 1.9
- Sum all memory limits → must ≤ 8 GB
- Check each service has resources block
```

### Docker Security
```
GREP:
1. privileged:\s*true                    → ❌ CRITICAL
2. network_mode:\s*host                  → ❌ HIGH in production
3. ports:\s*\n\s*-\s*"?\d+:\d+          → exposed ports (check if needed)
4. 127\.0\.0\.1:\d+:\d+                  → ✅ local-only binding (GOOD)
5. security_opt.*no-new-privileges       → ✅ security hardening (GOOD)
6. USER\s+\w+                            → ✅ non-root user in Dockerfile (GOOD)
```

### Build & Storage
```
GREP in Dockerfile:
1. gradlew|nativeCompile                 → ❌ shadow build (CRITICAL)
2. COPY.*\.jar                           → ✅ pre-built artifact (GOOD)
3. FROM.*AS.*builder                     → multi-stage build (check if final stage is lean)

GREP in docker-compose:
4. shm_size:\s*['"]?(\d+)               → shm_size value
5. volumes:\s*\n.*[a-z].*:/var/lib      → named volume (GOOD)
6. volumes:\s*\n.*\./.*:/var/lib        → ❌ bind mount for DB (risky)
```
