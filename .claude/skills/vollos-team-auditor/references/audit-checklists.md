# Audit Checklists Reference

รายการตรวจสอบละเอียดสำหรับแต่ละ audit dimension
ใช้เป็น reference โดย SKILL.md — ห้ามข้ามรายการใดรายการหนึ่ง

---

## 1. Security Audit Checklist

### 1.1 Hardcoded Secrets
```
SCAN PATTERNS:
- Grep: password|secret|api_key|token|credential|private_key|jwt
- Grep: Bearer\s+[A-Za-z0-9\-._~+/]+=*
- Grep: -----BEGIN (RSA |EC )?PRIVATE KEY-----
- ตรวจ String constants ที่มี pattern คล้าย base64 ยาว > 20 chars
- ตรวจ application.yml / application.properties สำหรับค่าที่ไม่ใช่ ${ENV_VAR}
- ตรวจ docker-compose.yml สำหรับ environment values ที่ hardcode
- ตรวจ .gitlab-ci.yml สำหรับ variables ที่ hardcode

EXCLUDE: test fixtures ที่มี "test" / "mock" / "dummy" ในชื่อไฟล์
SEVERITY: CRITICAL ถ้าเป็น production secret, HIGH ถ้าเป็น dev/staging
```

### 1.2 .env Safety
```
CHECK:
- .env อยู่ใน .gitignore หรือไม่
- .env.example มีหรือไม่ (ถ้าไม่มี → MEDIUM)
- .env ถูก commit ไปแล้วใน git history หรือไม่ (git log --all --full-history -- .env)
- docker-compose.yml ใช้ env_file แทน environment hardcode หรือไม่

SEVERITY: CRITICAL ถ้า .env ไม่อยู่ใน .gitignore
```

### 1.3 SQL Injection
```
JAVA PATTERNS (Spring Boot):
- String concatenation ใน SQL: "SELECT.*" + variable
- @Query ที่ใช้ string interpolation แทน :param
- JdbcTemplate.query() ด้วย string concat
- Native query ที่ไม่ใช้ PreparedStatement
- ตรวจว่าใช้ Spring Data JPA parameterized queries

PYTHON PATTERNS (data-pipeline):
- f"SELECT ... {variable}" / "SELECT ... %s" % variable
- cursor.execute() ด้วย string format แทน parameterized
- SQLAlchemy text() โดยไม่ bind parameters

SEVERITY: CRITICAL
```

### 1.4 XSS
```
REACT (Chrome Extension):
- dangerouslySetInnerHTML ที่รับ user input โดยตรง
- innerHTML assignment
- document.write() / eval()
- URL จาก user input ที่ไม่ sanitize (javascript: protocol)
- postMessage handler ที่ไม่ตรวจ origin

NEXT.JS (marketing-site):
- Server Component ที่ render user input โดยไม่ escape
- API route ที่ return HTML โดยไม่ sanitize

SEVERITY: HIGH
```

### 1.5 CSRF
```
CHECK:
- Spring Security CSRF config: disabled สำหรับ API ที่ใช้ JWT → OK
- แต่ถ้า disable CSRF สำหรับ session-based auth → CRITICAL
- Cookie settings: SameSite, Secure, HttpOnly
- CORS config: allowedOrigins ที่เปิดกว้างเกิน (*)

SEVERITY: HIGH ถ้า CSRF disabled + session-based auth
```

### 1.6 Authentication & Authorization
```
CHECK:
- ทุก endpoint ใน @RestController มี security annotation หรือ SecurityFilterChain config
- Method-level security: @PreAuthorize / @Secured ใช้ถูกต้อง
- JWT validation: expiry check, signature verify, issuer validate
- Role/Permission model: RBAC implemented correctly
- Password encoding: BCrypt / Argon2 (ไม่ใช่ MD5/SHA1)
- Rate limiting บน login endpoint
- Account lockout mechanism

MISSING AUTH ENDPOINT:
- หา @RestController methods ที่ไม่มี security config ครอบ
- ตรวจ SecurityFilterChain ว่า permitAll() ใช้กับ path ที่ถูกต้อง

SEVERITY: CRITICAL ถ้า endpoint ไม่มี auth, HIGH ถ้า config อ่อน
```

### 1.7 Sensitive Data Logging
```
CHECK:
- log.info/debug/warn/error ที่พิมพ์ request body โดยไม่ mask
- toString() ของ entity ที่มี password/token field
- @Slf4j + MDC ที่ใส่ sensitive data
- Spring Actuator endpoints ที่เปิด /env, /configprops โดยไม่ lock
- Python print() / logging ที่แสดง API keys

SEVERITY: HIGH
```

### 1.8 SSRF (Server-Side Request Forgery)
```
CHECK:
- User input ถูกใช้เป็น URL ที่ backend fetch (RestTemplate, WebClient, HttpClient)
- URL validation: ตรวจ scheme (http/https only), ตรวจ private IP ranges
- Redirect following: ตรวจว่า follow redirects ไปยัง internal URLs ได้หรือไม่

SEVERITY: HIGH-CRITICAL
```

### 1.9 IDOR (Insecure Direct Object Reference)
```
CHECK:
- API endpoint ที่ใช้ ID จาก user input ดึงข้อมูล
- ตรวจว่ามี ownership check หรือไม่ (user A ดูข้อมูล user B ได้ไหม)
- PathVariable ที่เป็น UUID/ID โดยไม่ตรวจสิทธิ์

SEVERITY: HIGH-CRITICAL
```

### 1.10 Insecure Deserialization
```
JAVA:
- ObjectInputStream.readObject() — ใช้โดยไม่ whitelist classes
- Jackson: @JsonTypeInfo กับ default typing enabled
- Spring: HttpMessageConverter ที่รับ arbitrary class

SEVERITY: CRITICAL
```

### 1.11 Chrome Extension Specific
```
CHECK:
- manifest.json: permissions ที่กว้างเกิน (เช่น <all_urls>)
- web_accessible_resources ที่เปิดให้ทุก origin
- Content Script: DOM manipulation ที่ inject user data โดยไม่ sanitize
- postMessage: handler ที่ไม่ตรวจ event.origin
- chrome.storage: เก็บ token/credentials โดยไม่ encrypt
- Background script: message handler ที่ไม่ validate sender

SEVERITY: HIGH
```

### 1.12 Dependency Vulnerabilities
```
CHECK:
- Java: ตรวจ pom.xml / build.gradle versions เทียบกับ known CVEs
- Node.js: ตรวจ package.json versions
- Python: ตรวจ requirements.txt / pyproject.toml
- Flag: dependency ที่ไม่มี version pin
- Flag: dependency ที่ end-of-life / unmaintained

SEVERITY: ตาม CVE severity (CRITICAL/HIGH/MEDIUM)
```

---

## 2. Logic Bug Hunter Checklist

### 2.1 AI Hallucination Risk — LLM Without Ground Truth
```
CRITICAL PATTERN — "LLM เดาเอง":
- Gemini API call ที่ return ค่าสำคัญ (HS code, legal classification, tax rate)
  โดยไม่มี RAG retrieval / database lookup ก่อน
- ค่าจาก LLM ที่ถูกใช้ตรงๆ โดยไม่มี:
  1. การ cross-check กับ database/vector store
  2. confidence score threshold
  3. human review step
  4. fallback mechanism เมื่อ confidence ต่ำ

DETECTION:
- หา Gemini/LLM API calls → trace output → ดูว่าผลถูกใช้ตรงๆ หรือผ่าน validation
- หา prompt ที่ถาม LLM ให้ "classify" / "determine" / "identify" โดยไม่ให้ reference data
- หา response parsing ที่ไม่มี confidence check

SEVERITY: CRITICAL ถ้าเป็น business-critical data (HS code, customs classification)
         HIGH ถ้าเป็น non-critical แต่ user-facing
```

### 2.2 Prompt Injection Risk
```
CHECK:
- User input ที่ถูกใส่เข้า LLM prompt โดยตรง (string concat / template literal)
- ไม่มี role separation (system prompt vs user message)
- ไม่มี input sanitization ก่อนส่งให้ LLM
- Chrome Extension → Backend → Gemini: user พิมพ์อะไรก็ไปถึง prompt ตรงๆ

DETECTION:
- หา prompt template / string ที่ concat กับ user input
- ตรวจว่า system prompt ถูกแยกจาก user content
- ตรวจว่ามี input length limit

SEVERITY: HIGH-CRITICAL (ขึ้นกับว่า LLM มี tool/function calling ที่ทำ action ได้หรือไม่)
```

### 2.3 RAG Pipeline Quality
```
CHECK:
- Chunking: document ถูก chunk อย่างไร? overlap มีหรือไม่?
- Embedding: model version ตรงกันระหว่าง index time vs query time?
- Similarity search: มี threshold ก่อน return results หรือไม่?
- Context window: retrieved chunks ถูกตัดตรงไหนก่อนส่งให้ LLM?
- Data freshness: มี re-indexing schedule หรือไม่?
- Fallback: ถ้า retrieval ไม่พบ results ระบบทำอย่างไร?

SEVERITY: HIGH ถ้าไม่มี threshold, MEDIUM ถ้า config ไม่ optimal
```

### 2.4 Race Conditions
```
JAVA:
- @Async methods ที่ access shared state โดยไม่ synchronize
- @Transactional ที่ read-then-write โดยไม่ lock (lost update)
- CompletableFuture chains ที่ share mutable state
- Redis operations ที่ไม่ atomic (GET → modify → SET แทน INCR/Lua script)

PYTHON:
- Threading/multiprocessing ที่ share data โดยไม่ lock
- async operations ที่ modify shared state

SEVERITY: HIGH
```

### 2.3 Data Flow Integrity
```
CHECK:
- Request → Service → Repository: data transformation ที่อาจสูญหาย
- DTO ↔ Entity mapping: field ที่ถูก ignore หรือ map ผิด
- Pagination: off-by-one, missing total count
- File upload: size limit, type validation, storage path injection
- Chrome Extension → Backend: message passing ที่ data อาจ corrupt
- n8n webhook → Backend: payload validation

SEVERITY: HIGH ถ้า data loss, MEDIUM ถ้า data corruption
```

### 2.4 Edge Cases
```
CHECK:
- Null handling: Optional.get() โดยไม่ isPresent(), NPE potential
- Empty collection: .get(0) โดยไม่ check isEmpty()
- Boundary values: integer overflow, empty string, unicode
- Timezone: date/time operations ที่ไม่ specify timezone
- Encoding: UTF-8 handling สำหรับ Thai text

SEVERITY: MEDIUM-HIGH
```

---

## 3. Code Quality Checklist

### 3.1 Dead Code
```
CHECK:
- Unused imports (Java: IDE warnings, Python: flake8 F401)
- Unused methods/functions ที่ไม่มี caller
- Commented-out code blocks > 5 lines
- Unreachable code after return/throw
- Unused @Bean definitions
- Unused React components / hooks

SEVERITY: LOW
```

### 3.2 Error Handling
```
ANTI-PATTERNS:
- catch (Exception e) {} — empty catch block
- catch (...) { log.error(e); } — log only without recovery/rethrow
- @ExceptionHandler ที่ return 200 OK สำหรับ error
- Python: bare except: pass
- Promise .catch(() => {}) — swallowed error
- try/catch ที่ catch เฉพาะ generic Exception แทน specific

SEVERITY: MEDIUM-HIGH
```

### 3.3 TODO/FIXME/HACK
```
SCAN: TODO|FIXME|HACK|XXX|WORKAROUND|TEMP|TEMPORARY
- นับจำนวนและแสดงทั้งหมด
- Flag ที่มีอายุ > 30 วัน (ดูจาก git blame)

SEVERITY: LOW (แต่รายงานทุกรายการ)
```

### 3.4 Input Validation
```
CHECK:
- @RequestBody โดยไม่มี @Valid / @Validated
- @RequestParam / @PathVariable โดยไม่มี validation
- API endpoint ที่รับ user input โดยไม่ sanitize
- File upload ที่ไม่ตรวจ extension/MIME type
- Search input ที่ไม่ limit length

SEVERITY: MEDIUM-HIGH
```

---

## 4. Architecture Smell Checklist

### 4.1 Module Coupling
```
MODULAR MONOLITH RULES:
- Module A ห้าม import internal class ของ Module B โดยตรง
- ต้องผ่าน public API (interface) เท่านั้น
- ห้ามมี circular dependency ระหว่าง modules

DETECTION:
- ตรวจ import statements ข้าม module boundaries
- feature-customsguard → platform-core: OK (depend on core)
- platform-core → feature-customsguard: VIOLATION (core ห้ามรู้จัก feature)
- feature-A → feature-B internal: VIOLATION

SEVERITY: HIGH
```

### 4.2 Docker Compose Security
```
CHECK:
- environment: ที่ hardcode secret values
- ports: ที่ expose ไม่จำเป็น (เช่น DB port to host)
- volumes: ที่ mount sensitive paths
- image: ที่ไม่ pin version (latest tag)
- network: ที่ไม่แยก internal/external
- healthcheck: ที่ไม่มี
- restart policy: ที่ไม่มี
- resource limits: ที่ไม่ set (2 CPU / 8 GB constraint)

SEVERITY: HIGH ถ้า secret exposed, MEDIUM ถ้า config อ่อน
```

### 4.3 GitLab CI Security
```
CHECK:
- Variables ที่ hardcode ใน .gitlab-ci.yml แทน CI/CD variables
- SSH keys / credentials ใน repo
- Docker build ที่ไม่ใช้ multi-stage (leak build tools)
- Deploy script ที่ไม่ validate target
- Missing security scanning stages
- Artifact ที่ไม่ set expiry

SEVERITY: HIGH ถ้า credentials exposed, MEDIUM ถ้า missing best practices
```

### 4.4 Infrastructure
```
CHECK:
- Nginx config: security headers (X-Frame-Options, CSP, HSTS)
- SSL: certificate validity, TLS version
- Redis: requirepass set, bind address
- PostgreSQL: pg_hba.conf, SSL mode
- n8n: authentication enabled, webhook security
- MinIO/S3: bucket policy, access control

SEVERITY: HIGH-CRITICAL ตาม exposure
```

---

## 5. Domain Compliance Checklist

### 5.1 Data Source Accuracy (แหล่งข้อมูล)
```
CHECK:
- อัตราแลกเปลี่ยน: ต้องมาจาก customs.go.th (ไม่ใช่ BOT, ธนาคาร, Google)
- FTA Form names: ต้องตรงกับประกาศกรมศุลกากร (ดู domain-knowledge.md ส่วน 5)
- HS Code data: ต้องอ้างอิง AHTN 2022
- LPI list: ต้องอ้างอิงกรมที่เกี่ยวข้อง (กรมประมง, อย., สมอ.)

GREP: customs.go.th, bot.or.th, exchange_rate, exchangeRate, อัตราแลกเปลี่ยน
SEVERITY: CRITICAL ถ้าใช้แหล่งผิด → ลูกค้าคำนวณอากรผิด
```

### 5.2 Calculation Completeness (ความครบถ้วนของการคำนวณ)
```
CHECK:
- คำนวณ VAT 7% หรือไม่ → VAT = (CIF + Import Duty) × 7%
- CIF รวม Insurance + Freight หรือไม่ (ไม่ใช่แค่ราคาสินค้า)
- มี Excise Tax logic สำหรับสินค้าพิเศษหรือไม่
- แสดง total (Duty + VAT + Excise) ให้ user เห็นหรือไม่
- Specific vs Ad Valorem: รองรับทั้ง 2 แบบหรือไม่

GREP: vat, VAT, duty, tax, cif, CIF, excise, total_tax, totalTax, calculate
SEVERITY: CRITICAL ถ้าไม่คำนวณ VAT (ลูกค้าประมาณต้นทุนผิด 7%+)
```

### 5.3 Regulatory Rules (กฎระเบียบปัจจุบัน)
```
CHECK:
- De Minimis: ตั้งแต่ 1 ม.ค. 2026 ยกเลิกแล้ว ทุกรายการต้องจ่ายอากร
  → ถ้า code ยังยกเว้น ≤1,500 บาท = CRITICAL
- หน่วยน้ำหนัก: บังคับ KG ตาม พ.ร.บ.ศุลกากร ม.51
  → ถ้ารับ free text โดยไม่บังคับ KG = HIGH
- ประเภทใบขน: ต้องรองรับ 4 ประเภท (IMPORT/EXPORT/TRANSIT/TRANSSHIPMENT)
  → ถ้ามีไม่ครบ = HIGH

GREP: de_minimis, deMinimis, 1500, exempt, ยกเว้น, threshold, weight, kg, unit
GREP: IMPORT, EXPORT, TRANSIT, TRANSSHIPMENT, declarationType
SEVERITY: CRITICAL-HIGH ตามผลกระทบ
```

### 5.4 Data Format Consistency (ความสม่ำเสมอของข้อมูล)
```
CHECK:
- HS Code format: ทุกที่ใช้ DDDD.DD / DDDD.DD.DD ตาม AHTN 2022
  → ถ้าปน "030617" (ไม่มีจุด) กับ "0306.17" = HIGH
- LPI prefix: normalize เป็น chapter level (4 หลัก) ทั้งระบบ
  → ถ้าปน 4 หลัก กับ 6 หลัก = CRITICAL (match ไม่ได้)
- Seed data vs Pipeline vs RAG chunks: ใช้ format เดียวกัน
  → ถ้าไม่ consistent = HIGH (JOIN/lookup ไม่ได้)
- FTA Form names: ชื่อเดียวกันทั้ง seed, pipeline, RAG
  → ถ้าไม่ตรง = CRITICAL

GREP: hsCode, hs_code, format, validate, isValid, prefix, chapter
SEVERITY: CRITICAL ถ้ากระทบ data matching, HIGH ถ้ากระทบ display
```

### 5.5 Input Validation — Domain-Specific
```
CHECK:
- HS Code input: validate format DDDD.DD / DDDD.DD.DD (frontend + backend)
  → ถ้ารับอะไรก็ได้ = HIGH
- Weight input: บังคับตัวเลข + หน่วย KG
  → ถ้ารับ "500 boxes" = HIGH
- Currency: ต้องเป็น ISO 4217 code (USD, JPY, EUR, ...)
  → ถ้ารับ free text = MEDIUM
- CIF components: Cost, Insurance, Freight ต้องเป็นตัวเลข ≥ 0
  → ถ้าไม่ validate = MEDIUM

GREP: validate, validation, @Pattern, @Min, @Max, isValid, regex
SEVERITY: HIGH ถ้ากระทบ customs filing, MEDIUM ถ้ากระทบ UX
```

### 5.6 Frontend-Backend Parity
```
CHECK:
- Declaration type enum: Backend vs Frontend ตรงกัน
- HS Code validation: ทั้ง 2 ฝั่ง validate เหมือนกัน
- Weight unit: Backend column type vs Frontend input constraints
- FTA form names: DB seed vs UI dropdown
- Currency list: Exchange rate entity vs UI selector
- Error messages: Backend exception vs UI error text สื่อความตรงกัน

METHOD:
1. Read Backend enums / validation annotations
2. Read Frontend types / validation functions
3. เปรียบเทียบทีละจุด

SEVERITY: HIGH ถ้า feature ใช้ไม่ได้, MEDIUM ถ้า inconsistent แต่ยังทำงานได้
```

### 5.7 Data Freshness
```
CHECK:
- อัตราแลกเปลี่ยน: มี @Scheduled / cron สำหรับ auto-sync หรือไม่
  → ถ้า static seed เท่านั้น = CRITICAL
- FTA rates: มี mechanism สำหรับ update หรือไม่
  → ถ้า static = HIGH
- มี last_updated / synced_at field ที่แสดงให้ user เห็นไหม
  → ถ้าไม่มี = MEDIUM (user ไม่รู้ว่าข้อมูลเก่าแค่ไหน)
- มี admin endpoint สำหรับ manual sync ไหม (backup)
  → ถ้าไม่มี = LOW

GREP: @Scheduled, cron, sync, fetch, auto, schedule, last_updated, synced_at
SEVERITY: CRITICAL ถ้า data ที่กระทบเงินเป็น static
```

### 5.8 Display Completeness
```
CHECK:
- UI แสดง Duty rate + VAT + Total ครบหรือไม่
  → ถ้าแค่ Duty = HIGH (ลูกค้าประมาณต้นทุนผิด)
- มีวันที่ของอัตราแลกเปลี่ยนแสดงหรือไม่
  → ถ้าไม่มี = MEDIUM
- Error messages บอก "ต้องทำอะไร" ไม่ใช่แค่ "ผิด"
  → ถ้าแค่ "Invalid" = MEDIUM
- LPI warning แสดงเมื่อสินค้าต้องขอใบอนุญาต
  → ถ้าไม่แสดง = HIGH (ลูกค้าไม่รู้ว่าต้องขอ)

SEVERITY: HIGH ถ้ากระทบการตัดสินใจ, MEDIUM ถ้ากระทบ UX
```

---

## Output Format Reference

### Report Structure
```
# Audit Report: [project-name]
วันที่: [date]
Mode: [Full / Targeted: module-name]
Auditor: vollos-code-auditor

---

## 🚨 CRITICAL FINDINGS (ถ้ามี — แสดงก่อนเสมอ)

พบ [N] รายการ CRITICAL ที่ต้องแก้ไขทันที:
1. [สรุปสั้นๆ]
2. [สรุปสั้นๆ]

---

## รายงานละเอียด

| # | Severity | Category | Finding | File | Line | คำอธิบาย |
|---|----------|----------|---------|------|------|----------|
| 1 | 🔴 CRITICAL | Security | Hardcoded API key | src/main/... | 42 | พบ API key ของ... |
| 2 | 🟠 HIGH | Logic | LLM เดา HS code | src/main/... | 156 | Gemini ถูกใช้... |
| 3 | 🟡 MEDIUM | Quality | Empty catch block | src/main/... | 89 | catch block ว่าง... |
| 4 | 🟢 LOW | Quality | Unused import | src/main/... | 3 | import ไม่ได้ใช้... |

---

## สรุปตาม Category

| Category | 🔴 CRITICAL | 🟠 HIGH | 🟡 MEDIUM | 🟢 LOW | รวม |
|----------|-------------|---------|-----------|--------|-----|
| Security | N | N | N | N | N |
| Logic | N | N | N | N | N |
| Quality | N | N | N | N | N |
| Architecture | N | N | N | N | N |
| Domain Compliance | N | N | N | N | N |
| **รวม** | **N** | **N** | **N** | **N** | **N** |
```

### Severity Definitions
```
🔴 CRITICAL: ต้องแก้ทันที — security breach, data loss, production break
🟠 HIGH:     ควรแก้ใน sprint นี้ — logic error, security weakness, boundary violation
🟡 MEDIUM:   ควรแก้ภายใน 2 sprints — code smell, missing validation
🟢 LOW:      nice to have — cleanup, style, documentation
```

---

## 6. Java & Spring Boot Checklist

### 6.1 Virtual Thread Safety
```
CHECK:
- ห้าม `synchronized` ใน @Service / @Repository class
  → virtual thread ถูก pin กับ carrier thread → throughput ลดรุนแรง
- ใช้ `ReentrantLock` หรือ `java.util.concurrent` แทน
- ตรวจ 3rd-party libraries ที่ใช้ synchronized ภายใน (e.g. JDBC drivers เก่า)
- SecurityContextHolder กับ Virtual Threads: async task ต้องส่ง context ถูกต้อง
  → ใช้ SecurityContextHolder.MODE_INHERITABLETHREADLOCAL หรือ propagate manually

GREP: synchronized, ReentrantLock, @Async, CompletableFuture
SEVERITY: CRITICAL ถ้า synchronized ใน hot path service
```

### 6.2 UUID v7 & ID Generation
```
CHECK:
- ห้าม GenerationType.AUTO / IDENTITY / SEQUENCE
  → ต้องสร้าง UUID v7 จาก Application Layer (Sequential Write Rule)
- ตรวจ @Id + @GeneratedValue annotations ทุก Entity
- ตรวจว่าใช้ UUID v7 library (e.g. uuid-creator, java.util.UUID custom)

GREP: GenerationType, @GeneratedValue, @Id, UUID
SEVERITY: CRITICAL ถ้าใช้ AUTO/IDENTITY (ละเมิด Architecture Commandment)
```

### 6.3 HikariCP Configuration
```
CHECK:
- leak-detection-threshold ต้องเปิด (แนะนำ 30000ms = 30 วินาที)
- maximum-pool-size เหมาะสมกับ VPS (แนะนำ 10-15 สำหรับ 2 CPU)
- connection-timeout ตั้งค่าไว้ (ไม่ใช่ default 30s ที่อาจนานเกิน)

GREP: hikari, leak-detection, maximum-pool-size, connection-timeout
SEVERITY: HIGH ถ้าไม่เปิด leak detection, MEDIUM ถ้า pool size ไม่เหมาะ
```

### 6.4 202 Accepted Pattern
```
CHECK:
- Long-running operations (AI inference, embedding, PDF processing) ต้อง:
  1. Return 202 Accepted + Job ID ทันที
  2. Process แบบ async
  3. มี polling endpoint (GET /jobs/{id}) หรือ SSE/WebSocket
- ห้าม synchronous block > 30 วินาที

GREP: @Async, CompletableFuture, 202, Accepted, jobId, Job
SEVERITY: HIGH ถ้า long-running op ยัง synchronous
```

### 6.5 GraalVM Compatibility
```
CHECK:
- Jackson: ใช้ Blackbird module (ไม่ใช่ Afterburner — ใช้ byte generation)
- Reflection: libraries ที่ใช้ reflection ต้อง register RuntimeHintsRegistrar
- Proxy: dynamic proxy ต้อง registered
- Resource: classpath resources ต้อง declared ใน native-image config

GREP: afterburner, Afterburner, RuntimeHints, @RegisterReflection
SEVERITY: HIGH ถ้าใช้ afterburner, MEDIUM ถ้าขาด hints
```

### 6.6 Transaction & Tenant Context
```
CHECK:
- SET LOCAL app.current_tenant_id ต้องอยู่ใน @Transactional method
  → ถ้าไม่มี transaction → SET LOCAL จะหายหลัง statement
- @Transactional propagation ถูกต้อง (REQUIRED default)
- ตรวจ TenantConnectionInterceptor ทำงานกับ Virtual Threads ถูกต้อง

GREP: SET LOCAL, @Transactional, TenantConnection, current_tenant
SEVERITY: CRITICAL ถ้า tenant context หายระหว่าง request
```

### 6.7 Resource Limits
```
CHECK:
- Heap max: -Xmx512m (ข้อจำกัด VPS 8GB)
- Thread.sleep ห้ามใช้ใน production (ใช้ ScheduledExecutorService แทน)
- Graceful shutdown: spring.lifecycle.timeout-per-shutdown-phase ต้องตั้ง
- Token expiry: JWT ≤ 24h

GREP: -Xmx, Thread.sleep, timeout-per-shutdown, token.*expir
SEVERITY: HIGH ถ้า heap > 512MB หรือ token > 24h
```

---

## 7. Database & Migration Checklist

### 7.1 RLS (Row-Level Security)
```
CHECK:
- ทุก tenant-owned table ต้องมี RLS policy:
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid)
- ต้องมี ALTER TABLE ... ENABLE ROW LEVEL SECURITY
- ต้องมี ALTER TABLE ... FORCE ROW LEVEL SECURITY
- Policy ต้อง cover ทั้ง SELECT, INSERT, UPDATE, DELETE

GREP in migrations: ROW LEVEL SECURITY, ENABLE ROW, FORCE ROW, CREATE POLICY
SEVERITY: CRITICAL ถ้า RLS หายไป (data leak ข้าม tenant)
```

### 7.2 Column Standards
```
CHECK:
- tenant_id UUID NOT NULL บน tenant-owned tables ทุกตัว
- UUID v7 PK: ห้าม SERIAL / BIGSERIAL / GENERATED ALWAYS AS IDENTITY
- TIMESTAMPTZ: ห้ามใช้ TIMESTAMP (ไม่มี timezone)
- created_at, updated_at ต้องเป็น TIMESTAMPTZ

GREP in migrations: SERIAL, BIGSERIAL, TIMESTAMP, tenant_id, created_at
SEVERITY: CRITICAL ถ้าขาด tenant_id, HIGH ถ้าใช้ TIMESTAMP แทน TIMESTAMPTZ
```

### 7.3 Index Management
```
CHECK:
- Index Quota: ≤ 5 indexes per table (รวม PK)
  → ป้องกัน write amplification บน VPS 8GB
- Composite Index: ต้องเริ่มด้วย tenant_id สำหรับ tenant data
- Partial Index: ควรใช้ WHERE clause (e.g. WHERE active = true)
- ห้าม SELECT * ใน views / functions ของ migrations

GREP in migrations: CREATE INDEX, CREATE UNIQUE INDEX, SELECT \*
COUNT: นับ index ต่อ table — flag ถ้า > 5
SEVERITY: MEDIUM ถ้า index เกิน quota, HIGH ถ้า composite ไม่มี tenant_id
```

### 7.4 Feature Module Conventions
```
CHECK:
- Feature Prefix: ต้องเริ่มด้วย cg_ สำหรับ CustomsGuard tables
- Feature migration versions: ≥ V1000 (ป้องกัน conflict กับ core V1-V999)
- Migration location: db/features/{feature-name}/ ไม่ใช่ db/migration/

GREP: CREATE TABLE, V\d+__, feature-customsguard
SEVERITY: HIGH ถ้า prefix ผิด หรือ version < 1000
```

### 7.5 Entity Java Mapping
```
CHECK:
- ห้าม @GeneratedValue(strategy = GenerationType.AUTO)
- ต้องมี tenantId field (UUID, NOT NULL)
- ต้องมี createdAt, updatedAt (LocalDateTime หรือ Instant)
- @Column(nullable = false) สำหรับ required fields

GREP: @Entity, @GeneratedValue, tenantId, createdAt, updatedAt
SEVERITY: CRITICAL ถ้าใช้ AUTO generation, HIGH ถ้าขาด tenantId
```

---

## 8. Infrastructure & Resources Checklist

### 8.1 The 1.9 Rule (CPU)
```
CHECK docker-compose*.yml:
- รวม CPU limits ทุก service ≤ 1.9 cores (0.1 สำรอง Host OS)
- Budget อ้างอิง:
  PostgreSQL  0.4 CPU
  Redis       0.2 CPU
  Java Backend 0.6 CPU
  n8n         0.5 CPU
  Nginx       0.1 CPU
  รวม         1.8 CPU (เหลือ 0.1 buffer)

GREP: deploy, resources, limits, cpus
SEVERITY: CRITICAL ถ้ารวม > 1.9 (Host OS จะ starve)
```

### 8.2 RAM Budget (8 GB)
```
CHECK:
- รวม memory limits ทุก service ≤ 8 GB
- Budget อ้างอิง:
  PostgreSQL  1.5 GB
  Redis       512 MB
  Java Backend 1.0 GB (Heap 512MB + overhead)
  n8n         2.0 GB
  Nginx       256 MB
  รวม         ~5.3 GB (เหลือ ~2.7 GB สำหรับ OS + buffer)

GREP: memory, mem_limit
SEVERITY: CRITICAL ถ้ารวม > 8 GB
```

### 8.3 Docker Service Requirements
```
CHECK ทุก service ใน docker-compose:
1. deploy.resources.limits — ต้องมี CPU + memory limits
2. healthcheck — ต้องมี (interval, timeout, retries)
3. restart: unless-stopped หรือ always
4. logging: max-size 10m, max-file 3
5. security_opt: no-new-privileges (แนะนำ)

MISSING = HIGH สำหรับ limits/healthcheck, MEDIUM สำหรับ logging/restart
```

### 8.4 Security Constraints
```
CHECK:
- ห้าม privileged: true (container escape risk)
- ห้าม network_mode: host ใน production
- Dev ports: bind 127.0.0.1 only (e.g. "127.0.0.1:5432:5432")
- Production: ห้าม expose DB/Redis ports
- Dockerfile: non-root user (USER appuser)

GREP: privileged, network_mode, ports:, USER
SEVERITY: CRITICAL ถ้า privileged, HIGH ถ้า host network mode
```

### 8.5 Build & Storage Rules
```
CHECK:
- Shadow Build Ban: ห้าม RUN ./gradlew หรือ nativeCompile ใน production Dockerfile
  → ใช้ CI/CD build แล้ว COPY artifact เข้า container
- PostgreSQL shm_size: ≥ 256MB (ป้องกัน shared memory error)
- Volume: DB data ต้องเป็น named volumes (ไม่ใช่ bind mount)
- Binary-Free: ห้ามเก็บ binary ใน container filesystem → ใช้ S3/MinIO

GREP: gradlew, nativeCompile, shm_size, volumes:
SEVERITY: CRITICAL ถ้า shadow build, HIGH ถ้า shm_size < 256MB
```

### 8.6 Observability
```
CHECK:
- Structured logging: JSON format (logback-spring.xml / logstash-logback-encoder)
  → ถ้า plain text ใน production = MEDIUM
- Request correlation: MDC traceId/requestId propagated across services
  → ถ้าไม่มี = MEDIUM (debug ยากมากเมื่อ multi-tenant)
- Health metrics endpoint: /actuator/health + /actuator/prometheus (ถ้ามี monitoring)
  → ถ้าไม่มี health endpoint = HIGH
- Alerting config: disk space, memory, error rate thresholds
  → ถ้าไม่มี = MEDIUM (production visibility)
- Audit logging: ทุก destructive action (DELETE, role change) ต้อง log
  → ถ้าไม่มี = HIGH
- Log rotation: max-size + max-file ต้องตั้งค่า (ป้องกัน disk full)
  → ถ้าไม่มี = HIGH

GREP: logback, logstash, MDC, traceId, actuator, prometheus, alert
SEVERITY: HIGH ถ้า missing health endpoint, MEDIUM ถ้า missing structured logging
```

---

## 9. Supply Chain & AI/LLM Security Checklists

### 1.13 Supply Chain Security (SCA)
```
CHECK:
- Dependency pinning: ทุก dependency ต้อง pin version (ไม่ใช่ latest / *)
  Java: build.gradle.kts ใช้ exact version, Python: requirements.txt pin, Node: package-lock.json committed
- Known CVE scan: ตรวจ dependency versions เทียบ known vulnerabilities
  → ใช้ `./gradlew dependencyInsight` หรือ GitHub Dependabot alerts
- Transitive dependencies: ตรวจว่า dependency tree ไม่มี known-bad transitive deps
- SBOM awareness: ระบบควรสามารถ generate Software Bill of Materials ได้
  → ถ้าไม่มี = LOW (nice to have สำหรับ enterprise customers)
- Docker base image: pin to digest (sha256) ไม่ใช่แค่ tag
  → ถ้าใช้ :latest = HIGH

GREP: implementation\(, dependencies, FROM, requirements, package.json
SEVERITY: HIGH ถ้า unpinned critical deps, MEDIUM ถ้า missing lock files
```

### 1.14 AI/LLM Security (Extended)
```
CHECK — Prompt Injection Depth:
- System prompt isolation: system message ต้องแยกจาก user content ชัดเจน
  → ถ้า concat เป็น string เดียว = CRITICAL
- Input sanitization: user input ต้องผ่าน filter ก่อนเข้า prompt
  → ตรวจ ChatGuardService / prompt injection filter
- Output validation: LLM output ที่เป็น structured data (JSON) ต้อง parse + validate schema
  → ถ้า trust LLM output ตรงๆ = HIGH
- Tool/Function calling: ถ้า LLM มี function calling → ตรวจว่ามี allowlist
  → ถ้าไม่มี = CRITICAL

CHECK — RAG Poisoning:
- Data ingestion: ข้อมูลที่เข้า vector store ต้องผ่าน validation
  → ถ้ารับ user-uploaded documents โดยไม่ filter = HIGH
- Embedding model consistency: index time vs query time ต้องใช้ model เดียวกัน
  → ถ้าไม่ตรง = CRITICAL (search ผิดหมด)
- Chunk metadata: ต้องมี source attribution เพื่อ trace กลับไปได้
  → ถ้าไม่มี = MEDIUM

CHECK — Hallucination Guardrails:
- Confidence threshold: ถ้า similarity score < threshold → ต้อง fallback
  → ถ้าไม่มี threshold = HIGH
- Ground truth validation: LLM output ที่เป็น business-critical (HS code, tax rate)
  ต้อง cross-check กับ database/official source
  → ถ้าไม่มี = CRITICAL
- Human-in-the-loop: สำหรับ high-stakes decisions ต้องมี manual review option
  → ถ้าไม่มี = MEDIUM

GREP: generateContent, sendMessage, gemini, ChatGuardService, similarity, threshold, confidence
SEVERITY: CRITICAL ถ้า LLM output ใช้ตรงๆ สำหรับ business-critical data
```

### 1.15 RBAC (Role-Based Access Control)
```
CHECK:
- Role model: ระบบต้องมี role definitions ชัดเจน (เช่น ADMIN, USER, VIEWER)
  → ตรวจ UserEntity, enum, migration
- Endpoint authorization: ทุก endpoint ต้องมี role check
  → @PreAuthorize / SecurityFilterChain role-based rules
- Role escalation: ห้าม user เปลี่ยน role ตัวเอง
  → ตรวจ admin endpoints ว่ามี role check
- Admin-only endpoints: seed, embed-all, sync, admin operations ต้อง ADMIN only
  → ถ้า permitAll = CRITICAL
- Default role: new user ต้องได้ role ต่ำสุด (USER/VIEWER) ไม่ใช่ ADMIN
  → ถ้า default = ADMIN = CRITICAL

GREP: @PreAuthorize, @Secured, hasRole, ADMIN, USER, VIEWER, role, Role
SEVERITY: CRITICAL ถ้า admin endpoint ไม่มี role check
```
