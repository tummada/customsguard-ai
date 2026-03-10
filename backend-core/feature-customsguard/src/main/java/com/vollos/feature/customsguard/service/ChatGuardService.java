package com.vollos.feature.customsguard.service;

import com.vollos.core.tenant.TenantContext;
import com.vollos.feature.customsguard.config.ChatGuardProperties;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.text.Normalizer;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Guards the RAG chat endpoint against abuse:
 * 1. Rate limiting per tenant (Redis sliding window)
 * 2. Prompt injection detection (expanded: Thai, role-play, fictional framing)
 * 3. PII detection (Thai ID, phone, email)
 * 3.5 PII request detection (requests for others' personal data)
 * 3.8 Harmful intent detection (smuggling, fraud, with safe-context bypass)
 * 4. Customs keyword priority check (bypass gibberish/greeting only)
 * 5. Gibberish detection
 * 6. Greeting/Thanks detection
 * 7. Meta-support detection
 * 7.5 Social engineering detection (authority impersonation)
 * 8. Off-topic query filtering (expanded)
 */
@Service
public class ChatGuardService {

    private static final Logger log = LoggerFactory.getLogger(ChatGuardService.class);

    private static final Duration WINDOW = Duration.ofMinutes(1);

    // NFKC helper — normalize Thai strings so สระอำ (U+0E33) matches its decomposed form (U+0E4D+U+0E32)
    private static String nfkc(String s) {
        return Normalizer.normalize(s, Normalizer.Form.NFKC);
    }

    private static Pattern nfkcPattern(String regex) {
        return Pattern.compile(nfkc(regex));
    }

    private static Set<String> nfkcSet(String... items) {
        var set = new LinkedHashSet<String>();
        for (String item : items) set.add(nfkc(item));
        return Collections.unmodifiableSet(set);
    }

    private static List<String> nfkcList(String... items) {
        var list = new ArrayList<String>();
        for (String item : items) list.add(nfkc(item));
        return Collections.unmodifiableList(list);
    }

    // Prompt injection patterns
    private static final List<Pattern> INJECTION_PATTERNS = List.of(
            // Classic English injection
            Pattern.compile("(?i)ignore\\s+(all\\s+)?previous\\s+instructions"),
            Pattern.compile("(?i)ignore\\s+(all\\s+)?above"),
            Pattern.compile("(?i)disregard\\s+(all\\s+)?previous"),
            Pattern.compile("(?i)forget\\s+(all\\s+)?(your|previous)\\s+instructions"),
            Pattern.compile("(?i)you\\s+are\\s+now\\s+a"),
            Pattern.compile("(?i)act\\s+as\\s+(a|an)\\s+"),
            Pattern.compile("(?i)pretend\\s+(you\\s+are|to\\s+be)"),
            Pattern.compile("(?i)system\\s*prompt"),
            Pattern.compile("(?i)reveal\\s+(your|the)\\s+(system|instructions|prompt)"),
            Pattern.compile("(?i)what\\s+(are|is)\\s+your\\s+(instructions|system\\s+prompt)"),
            Pattern.compile("(?i)\\brole\\s*:\\s*system\\b"),
            Pattern.compile("(?i)###\\s*(system|instruction)"),
            // Thai injection — NFKC-normalized so สระอำ matches decomposed form
            nfkcPattern("ยก\\s*เลิก\\s*คำ\\s*สั่ง"),
            nfkcPattern("ลืม\\s*(คำสั่ง|ทุกอย่าง)"),
            nfkcPattern("ตอนนี้คุณ(คือ|เป็น)"),
            // Role-play / fictional framing / jailbreak
            Pattern.compile("(?i)imagine\\s+you\\s+are"),
            Pattern.compile("(?i)let'?s\\s+play\\s+a\\s+game"),
            Pattern.compile("(?i)as\\s+a\\s+thought\\s+experiment"),
            Pattern.compile("(?i)in\\s+(a\\s+)?fictional\\s+(scenario|movie|game|story)"),
            Pattern.compile("(?i)hypothetical(ly)?"),
            Pattern.compile("(?i)freedom\\s+ai"),
            Pattern.compile("(?i)do\\s+anything\\s+now"),
            // Harmful intent cross-referencing customs (bounded wildcard)
            Pattern.compile("(?i)(smuggl|bypass|evade|loophole).{0,40}(customs|regulation|detection|scanner)"),
            Pattern.compile("(?i)(customs|regulation|detection|scanner).{0,40}(smuggl|bypass|evade|loophole)")
    );

    // PII patterns (Thai-specific + universal)
    private static final List<Pattern> PII_PATTERNS = List.of(
            // Thai national ID: 13 digits with optional dashes (e.g., 1-1234-56789-01-2)
            Pattern.compile("\\b\\d[- ]?\\d{4}[- ]?\\d{5}[- ]?\\d{2}[- ]?\\d\\b"),
            // Thai phone: 08x/09x/06x with 10 digits
            Pattern.compile("\\b0[689]\\d[- ]?\\d{3}[- ]?\\d{4}\\b"),
            // Credit card: 16 digits with optional separators
            Pattern.compile("\\b\\d{4}[- ]?\\d{4}[- ]?\\d{4}[- ]?\\d{4}\\b"),
            // Email
            Pattern.compile("[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}")
    );

    // Customs domain keywords — if present, bypass gibberish/greeting checks (NFKC-normalized)
    private static final Set<String> CUSTOMS_KEYWORDS = nfkcSet(
            // Thai
            "พิกัด", "อากร", "ภาษี", "นำเข้า", "ส่งออก", "ศุลกากร",
            "ใบขน", "สินค้า", "แหล่งกำเนิด", "ใบอนุญาต",
            // English (lowercase)
            "hs", "fta", "acfta", "jtepa", "tariff", "duty",
            "import", "export", "customs", "code", "chapter", "heading"
    );

    // Greeting keywords (short greetings only, ≤30 chars)
    private static final Set<String> GREETING_KEYWORDS = nfkcSet(
            "สวัสดี", "หวัดดี", "hello", "hi", "hey",
            "good morning", "good evening", "good afternoon"
    );

    // Thanks keywords (short thanks only, ≤30 chars)
    private static final Set<String> THANKS_KEYWORDS = nfkcSet(
            "ขอบคุณ", "thank", "thanks"
    );

    // Meta-support keywords — user complaints/questions about the AI itself
    private static final Set<String> META_SUPPORT_KEYWORDS = nfkcSet(
            "ทำไมไม่ตอบ", "ดุจัง", "เก่งไหม", "เป็นใคร", "ช่วยอะไรได้บ้าง",
            "งง", "ถามอะไรได้", "ไม่เข้าใจ", "ตอบผิด", "ตอบไม่ได้",
            "มีแฟน", "ชื่ออะไร", "อายุเท่าไหร่", "เป็นคน", "เป็น ai"
    );

    private static final String META_SUPPORT_RESPONSE =
            "ขออภัยครับหากคำตอบก่อนหน้าดูติดขัดไปบ้าง ผมเป็น AI ผู้ช่วยด้านศุลกากร " +
            "ลองถามเป็นชื่อสินค้าดูไหมครับ เช่น \"พิกัดกุ้งแช่แข็ง\" หรือ \"อัตราอากรคอมพิวเตอร์\" " +
            "ผมจะหาข้อมูลได้แม่นยำขึ้นครับ";

    // Potential HS code pattern: starts with digit, then digits/dots/spaces/dashes (4-20 chars)
    private static final Pattern HS_CODE_PATTERN = Pattern.compile("^[0-9][0-9.\\s-]{3,19}$");

    // Thai character range
    private static final Pattern THAI_CHARS = Pattern.compile("[\\u0E00-\\u0E7F]");

    // English word (at least one real word)
    private static final Pattern ENGLISH_WORD = Pattern.compile("\\b[a-zA-Z]{2,}\\b");

    // Repeated character pattern — same char 5+ times in a row (e.g. ลลลลลล, aaaaaa)
    private static final Pattern REPEATED_CHAR = Pattern.compile("(.)\\1{4,}");

    // Off-topic keywords (things clearly outside customs domain)
    private static final List<String> OFF_TOPIC_KEYWORDS = nfkcList(
            "เขียนโค้ด", "write code", "programming", "เขียนโปรแกรม",
            "แต่งเพลง", "write a song", "compose music",
            "แต่งกลอน", "write a poem",
            "เล่าเรื่อง", "tell me a story", "tell a joke", "เล่ามุก",
            "ทำอาหาร", "recipe", "สูตรอาหาร", "สูตร",
            "translate this to", "แปลภาษา",
            // Subtle off-topic (customs-adjacent but not actionable)
            "history of", "socio-economic", "philosophical", "geopolitical",
            "architectural style", "cultural significance",
            "psychological profile", "recruitment method",
            // Harmful topics
            "chemical composition", "explosive", "วัตถุระเบิด",
            "drug smuggling", "ยาเสพติด", "narcotic",
            // Math/science disguised as customs
            "nautical miles", "how long will it take",
            // Academic/theoretical topics (not Thai customs operations)
            "quantum", "theoretical model", "ethical implications",
            "demographics", "biases against", "predictive analytics",
            "medieval", "silk road", "ancient",
            "machine learning", "neural network"
    );

    // Strong off-topic keywords — checked EVEN when customs keywords are present
    // These indicate the query is about customs-adjacent but non-operational topics
    private static final List<String> STRONG_OFF_TOPIC_KEYWORDS = nfkcList(
            "medieval", "silk road", "ancient",
            "quantum", "theoretical model",
            "ethical implications", "demographics", "biases against",
            "predictive analytics", "psychological profile",
            "recruitment method", "architectural style"
    );

    // PII request keywords — requests for others' personal data
    private static final List<String> PII_REQUEST_KEYWORDS = nfkcList(
            // Request for personal info
            "full name", "ชื่อเต็ม", "ที่อยู่", "address", "contact number",
            "เบอร์โทร", "passport", "หนังสือเดินทาง",
            // Request to dump system/user data
            "list of all", "all users", "all queries", "user queries",
            "customs declarations", "customs clearances",
            // Retrospective data requests
            "look up", "cross-reference", "verify a person",
            "retrieve", "provide me with a list",
            // Indirect PII (who/owner)
            "who is", "ใครคือ", "เจ้าของ", "ของใคร", "identify",
            "details of person", "owner of", "sender of"
    );

    // Harmful intent keywords — illegal activity requests
    private static final List<String> HARMFUL_INTENT_KEYWORDS = nfkcList(
            "smuggle", "smuggling", "ลักลอบ",
            "bypass detection", "avoid detection", "หลีกเลี่ยงการตรวจ",
            "bribe", "สินบน", "ติดสินบน",
            "counterfeit", "ของปลอม", "ปลอมแปลง",
            "prohibited items", "สิ่งของต้องห้าม",
            "conceal", "ซ่อน",
            // Financial fraud (customs-specific)
            "under-invoice", "under invoice", "fake invoice", "ใบกำกับปลอม",
            "under-declare", "สำแดงต่ำกว่าจริง", "เลี่ยงภาษี", "evade tax",
            "tax loophole", "split shipment", "แยกล็อต"
    );

    // Safe context — if present alongside harmful keywords, allow through (educational query)
    private static final List<String> HARMFUL_SAFE_CONTEXT = nfkcList(
            "how to prevent", "วิธีป้องกัน", "ตรวจจับ", "detect",
            "กฎหมาย", "ลงโทษ", "penalty", "punishment",
            "prevent", "enforcement", "บังคับใช้", "regulation",
            "มีวิธี", "อย่างไร"
    );

    // Social engineering keywords — authority impersonation
    private static final List<String> SOCIAL_ENGINEERING_KEYWORDS = nfkcList(
            // Authority claims
            "i am admin", "i am an admin", "i am the admin",
            "ผมเป็นแอดมิน", "ฉันเป็นแอดมิน",
            "security override", "urgent request from", "urgent directive",
            "override all", "disable all", "disable content filter",
            "system diagnostic", "system logs", "full log",
            // Role impersonation
            "senior administrator", "lead developer",
            "customs official", "customs officer",
            "from the ceo", "as per the new directive",
            "internal audit", "คำสั่งด่วน", "ปิดระบบกรอง",
            // Classified data extraction
            "ข้อมูลลับ", "confidential",
            // System-specific impersonation
            "vollos", "customsguard", "customs guard",
            "developer of vollos", "lead developer of customsguard"
    );

    // Max query length — prevent ReDoS on complex regex patterns
    private static final int MAX_QUERY_LENGTH = 1000;

    private final StringRedisTemplate redisTemplate;
    private final int maxRequestsPerMinute;

    public ChatGuardService(StringRedisTemplate redisTemplate, ChatGuardProperties props) {
        this.redisTemplate = redisTemplate;
        this.maxRequestsPerMinute = props.getMaxRequestsPerMinute();
    }

    /**
     * Run all guards on the query. Returns rejection message if blocked, empty if allowed.
     */
    public Optional<String> check(String query) {
        // 0. Normalize input: NFKC (homoglyphs) + truncate (ReDoS prevention)
        String normalized = normalizeInput(query);

        // 1. Rate limit
        Optional<String> rateLimit = checkRateLimit();
        if (rateLimit.isPresent()) return rateLimit;

        // 2. Prompt injection (expanded: Thai, role-play, fictional framing)
        Optional<String> injection = checkPromptInjection(normalized);
        if (injection.isPresent()) return injection;

        // 3. PII detection (regex — checks for actual PII in text)
        Optional<String> pii = checkPii(normalized);
        if (pii.isPresent()) return pii;

        // 3.5 PII request detection (keyword — checks for requests for others' data)
        Optional<String> piiRequest = checkPiiRequest(normalized);
        if (piiRequest.isPresent()) return piiRequest;

        // 3.8 Harmful intent (BEFORE customs bypass — always runs)
        Optional<String> harmful = checkHarmfulIntent(normalized);
        if (harmful.isPresent()) return harmful;

        // 4. Customs keyword priority — bypass gibberish/greeting/meta if customs-related
        //    BUT check for gibberish-with-customs-keyword (e.g. "Flurble customs dinglehopper")
        if (isGibberishWithCustomsKeyword(normalized)) {
            log.warn("GUARD_BLOCK category=gibberish keyword='customs_gibberish_mix' tenant={} query_prefix='{}'",
                    TenantContext.getCurrentTenantId(),
                    normalized.substring(0, Math.min(50, normalized.length())));
            return Optional.of("ไม่เข้าใจคำถาม กรุณาพิมพ์คำถามเกี่ยวกับพิกัดศุลกากรหรืออัตราอากร");
        }
        if (!hasCustomsKeyword(normalized)) {
            // 5. Gibberish detection
            Optional<String> gibberish = checkGibberish(normalized);
            if (gibberish.isPresent()) return gibberish;

            // 6. Greeting/Thanks detection
            Optional<String> greeting = checkGreetingOrThanks(normalized);
            if (greeting.isPresent()) return greeting;

            // 7. Meta-support (complaints/questions about the AI)
            Optional<String> meta = checkMetaSupport(normalized);
            if (meta.isPresent()) return meta;
        }

        // 7.5 Social engineering (always runs — no customs bypass)
        Optional<String> social = checkSocialEngineering(normalized);
        if (social.isPresent()) return social;

        // 8. Off-topic (expanded keywords)
        Optional<String> offTopic = checkOffTopic(normalized);
        if (offTopic.isPresent()) return offTopic;

        return Optional.empty();
    }

    /**
     * Normalize input: NFKC (converts homoglyphs to standard chars) + length cap.
     */
    // Zero-width and invisible characters used for regex bypass
    private static final Pattern ZERO_WIDTH_CHARS = Pattern.compile(
            "[\\u200B\\u200C\\u200D\\u200E\\u200F\\u2060\\u2061\\u2062\\u2063\\u2064\\uFEFF\\u00AD]");

    private static String normalizeInput(String input) {
        String result = Normalizer.normalize(input, Normalizer.Form.NFKC);
        // Strip zero-width characters (U+200B-200F, U+2060-2064, FEFF, soft hyphen)
        result = ZERO_WIDTH_CHARS.matcher(result).replaceAll("");
        // Strip diacritics: NFD decompose then remove combining marks (á→a, é→e)
        String nfd = Normalizer.normalize(result, Normalizer.Form.NFD);
        result = nfd.replaceAll("\\p{InCombiningDiacriticalMarks}", "");
        if (result.length() > MAX_QUERY_LENGTH) {
            result = result.substring(0, MAX_QUERY_LENGTH);
        }
        return result;
    }

    /**
     * Strip obfuscation separators for keyword matching (p-a-s-s-p-o-r-t → passport).
     * Only used for PII request and social engineering keyword matching.
     */
    private static String stripObfuscation(String input) {
        // Remove dashes, underscores, dots, and spaces between single letters
        return input.replaceAll("(?<=[a-zA-Z])[-_.\\s]+(?=[a-zA-Z])", "");
    }

    private Optional<String> checkPiiRequest(String query) {
        String lower = query.toLowerCase();
        String stripped = stripObfuscation(lower);
        for (String keyword : PII_REQUEST_KEYWORDS) {
            String strippedKeyword = stripObfuscation(keyword.toLowerCase());
            if (lower.contains(keyword.toLowerCase()) || stripped.contains(strippedKeyword)) {
                log.warn("GUARD_BLOCK category=pii_request keyword='{}' tenant={} query_prefix='{}'",
                        keyword, TenantContext.getCurrentTenantId(),
                        query.substring(0, Math.min(50, query.length())));
                return Optional.of("ระบบนี้ไม่สามารถค้นหาหรือเปิดเผยข้อมูลส่วนบุคคลได้ หากต้องการสอบถามเกี่ยวกับพิกัดหรืออัตราอากร สามารถถามได้เลยครับ");
            }
        }
        return Optional.empty();
    }

    // Mixed-script harmful patterns — Thai customs keywords + English harmful intent
    private static final List<Pattern> MIXED_SCRIPT_HARMFUL = List.of(
            Pattern.compile("(?i)[\\u0E00-\\u0E7F].{0,30}(smuggl|bypass|evade|exploit|hack|steal)"),
            Pattern.compile("(?i)(smuggl|bypass|evade|exploit|hack|steal).{0,30}[\\u0E00-\\u0E7F]")
    );

    private Optional<String> checkHarmfulIntent(String query) {
        String lower = query.toLowerCase();
        String stripped = stripObfuscation(lower);

        // Check mixed-script harmful patterns (Thai + English harmful intent)
        for (Pattern pattern : MIXED_SCRIPT_HARMFUL) {
            if (pattern.matcher(query).find()) {
                // Check safe context first
                boolean safe = false;
                for (String safeWord : HARMFUL_SAFE_CONTEXT) {
                    if (lower.contains(safeWord.toLowerCase())) { safe = true; break; }
                }
                if (!safe) {
                    log.warn("GUARD_BLOCK category=harmful_mixed_script tenant={} query_prefix='{}'",
                            TenantContext.getCurrentTenantId(),
                            query.substring(0, Math.min(50, query.length())));
                    return Optional.of("ขออภัย ระบบนี้ไม่สามารถให้คำแนะนำเกี่ยวกับการกระทำที่ผิดกฎหมายได้ หากต้องการสอบถามเกี่ยวกับพิกัดหรืออัตราอากร สามารถถามได้เลยครับ");
                }
            }
        }

        boolean hasHarmful = false;
        for (String keyword : HARMFUL_INTENT_KEYWORDS) {
            if (lower.contains(keyword.toLowerCase()) || stripped.contains(stripObfuscation(keyword.toLowerCase()))) {
                hasHarmful = true;
                break;
            }
        }
        if (!hasHarmful) return Optional.empty();

        // Safe context bypass — educational/prevention queries are allowed
        for (String safe : HARMFUL_SAFE_CONTEXT) {
            if (lower.contains(safe.toLowerCase())) {
                log.info("Harmful keyword found but safe context present: safe='{}', tenant={}", safe, TenantContext.getCurrentTenantId());
                return Optional.empty();
            }
        }

        log.warn("GUARD_BLOCK category=harmful_intent keyword='(multiple)' tenant={} query_prefix='{}'",
                TenantContext.getCurrentTenantId(),
                query.substring(0, Math.min(50, query.length())));
        return Optional.of("ขออภัย ระบบนี้ไม่สามารถให้คำแนะนำเกี่ยวกับการกระทำที่ผิดกฎหมายได้ หากต้องการสอบถามเกี่ยวกับพิกัดหรืออัตราอากร สามารถถามได้เลยครับ");
    }

    private Optional<String> checkSocialEngineering(String query) {
        String lower = query.toLowerCase();
        String stripped = stripObfuscation(lower);
        for (String keyword : SOCIAL_ENGINEERING_KEYWORDS) {
            String strippedKeyword = stripObfuscation(keyword.toLowerCase());
            if (lower.contains(keyword.toLowerCase()) || stripped.contains(strippedKeyword)) {
                log.warn("GUARD_BLOCK category=social_engineering keyword='{}' tenant={} query_prefix='{}'",
                        keyword, TenantContext.getCurrentTenantId(),
                        query.substring(0, Math.min(50, query.length())));
                return Optional.of("ระบบนี้ไม่รองรับคำสั่งจากผู้ดูแลผ่านช่องแชท หากต้องการสอบถามเกี่ยวกับพิกัดหรืออัตราอากร สามารถถามได้เลยครับ");
            }
        }
        return Optional.empty();
    }

    // Atomic rate limit Lua script: increment + set TTL in single command
    private static final org.springframework.data.redis.core.script.RedisScript<Long> RATE_LIMIT_SCRIPT =
            org.springframework.data.redis.core.script.RedisScript.of(
                    "local count = redis.call('INCR', KEYS[1])\n" +
                    "if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end\n" +
                    "return count",
                    Long.class);

    private Optional<String> checkRateLimit() {
        UUID tenantId = TenantContext.getCurrentTenantId();
        if (tenantId == null) return Optional.empty();

        String key = "rag:rate:" + tenantId;
        try {
            Long count = redisTemplate.execute(RATE_LIMIT_SCRIPT,
                    List.of(key), String.valueOf(WINDOW.toSeconds()));
            if (count != null && count > maxRequestsPerMinute) {
                log.warn("GUARD_BLOCK category=rate_limit keyword='{}' tenant={} query_prefix='{}'",
                        count + "/min", tenantId, "");
                return Optional.of("คุณส่งคำถามเร็วเกินไป กรุณารอสักครู่แล้วลองใหม่ (จำกัด " + maxRequestsPerMinute + " ครั้ง/นาที)");
            }
        } catch (Exception e) {
            log.warn("Redis rate limit check failed, allowing request: {}", e.getMessage());
            // Fail open — if Redis is down, don't block users
        }
        return Optional.empty();
    }

    private Optional<String> checkPromptInjection(String query) {
        for (Pattern pattern : INJECTION_PATTERNS) {
            if (pattern.matcher(query).find()) {
                log.warn("GUARD_BLOCK category=injection keyword='{}' tenant={} query_prefix='{}'",
                        pattern.pattern(), TenantContext.getCurrentTenantId(),
                        query.substring(0, Math.min(50, query.length())));
                return Optional.of("ขออภัย ไม่สามารถประมวลผลคำถามนี้ได้ กรุณาถามเกี่ยวกับพิกัดศุลกากรหรืออัตราอากร");
            }
        }
        return Optional.empty();
    }

    private Optional<String> checkPii(String query) {
        for (Pattern pattern : PII_PATTERNS) {
            if (pattern.matcher(query).find()) {
                log.warn("GUARD_BLOCK category=pii_data keyword='{}' tenant={} query_prefix='{}'",
                        pattern.pattern(), TenantContext.getCurrentTenantId(),
                        query.substring(0, Math.min(50, query.length())));
                return Optional.of("กรุณาอย่าส่งข้อมูลส่วนบุคคล (เลขบัตรประชาชน, เบอร์โทร, อีเมล) ในช่องแชท");
            }
        }
        return Optional.empty();
    }

    private boolean hasCustomsKeyword(String query) {
        String q = query.trim().toLowerCase();
        for (String keyword : CUSTOMS_KEYWORDS) {
            if (q.contains(keyword)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check if query has customs keywords but most words are nonsense/unknown.
     * Returns true if the query looks like gibberish with customs keywords sprinkled in.
     */
    private boolean isGibberishWithCustomsKeyword(String query) {
        if (!hasCustomsKeyword(query)) return false;
        String[] words = query.trim().toLowerCase().split("\\s+");
        if (words.length < 4) return false;

        int knownCount = 0;
        for (String word : words) {
            // Count words that are customs keywords, common English, or Thai
            if (CUSTOMS_KEYWORDS.contains(word)) { knownCount++; continue; }
            if (THAI_CHARS.matcher(word).find()) { knownCount++; continue; }
            if (isCommonEnglishWord(word)) { knownCount++; continue; }
        }
        // If less than 40% of words are recognizable, it's gibberish with customs keywords
        return (double) knownCount / words.length < 0.4;
    }

    private static final Set<String> COMMON_ENGLISH = Set.of(
            "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
            "have", "has", "had", "do", "does", "did", "will", "would", "could", "should",
            "may", "might", "shall", "can", "need", "dare", "ought", "used",
            "for", "and", "nor", "but", "or", "yet", "so", "at", "by", "in", "of", "on",
            "to", "up", "it", "its", "my", "we", "he", "she", "they", "you", "i", "me",
            "this", "that", "these", "those", "what", "which", "who", "whom", "whose",
            "how", "when", "where", "why", "not", "no", "yes", "all", "any", "each",
            "from", "with", "about", "into", "through", "during", "before", "after",
            "if", "then", "than", "because", "as", "while", "between", "please",
            "rate", "code", "price", "product", "goods", "item", "number"
    );

    private static boolean isCommonEnglishWord(String word) {
        return COMMON_ENGLISH.contains(word) || word.length() <= 2;
    }

    private boolean isPotentialHsCode(String query) {
        return HS_CODE_PATTERN.matcher(query.trim()).matches();
    }

    private Optional<String> checkGibberish(String query) {
        String trimmed = query.trim();

        // HS code exception — numeric patterns like "030617" or "0306.17.00"
        if (isPotentialHsCode(trimmed)) {
            return Optional.empty();
        }

        boolean hasThai = THAI_CHARS.matcher(trimmed).find();
        boolean hasEnglishWord = ENGLISH_WORD.matcher(trimmed).find();

        // Rule 0: Repeated characters (ลลลลลล, aaaaaa) — keyboard smash
        if (REPEATED_CHAR.matcher(trimmed).find() && trimmed.length() > 5) {
            log.warn("GUARD_BLOCK category=gibberish keyword='repeated_chars' tenant={} query_prefix='{}'",
                    TenantContext.getCurrentTenantId(),
                    trimmed.substring(0, Math.min(50, trimmed.length())));
            return Optional.of("ดูเหมือนข้อความพิมพ์สลับกันไปหน่อยครับ ลองพิมพ์คำถามใหม่อีกครั้ง ผมพร้อมช่วยเช็คพิกัดและภาษีให้ครับ");
        }

        // Rule 1: No Thai chars AND no English words → gibberish
        if (!hasThai && !hasEnglishWord) {
            log.warn("GUARD_BLOCK category=gibberish keyword='no_thai_english' tenant={} query_prefix='{}'",
                    TenantContext.getCurrentTenantId(),
                    trimmed.substring(0, Math.min(50, trimmed.length())));
            return Optional.of("ไม่เข้าใจคำถาม กรุณาพิมพ์คำถามเกี่ยวกับพิกัดศุลกากรหรืออัตราอากร");
        }

        // Rule 2: English-only, >5 chars, no space → likely keyboard smash
        if (!hasThai && trimmed.length() > 5 && !trimmed.contains(" ")) {
            log.warn("GUARD_BLOCK category=gibberish keyword='no_space_english' tenant={} query_prefix='{}'",
                    TenantContext.getCurrentTenantId(),
                    trimmed.substring(0, Math.min(50, trimmed.length())));
            return Optional.of("ไม่เข้าใจคำถาม กรุณาพิมพ์คำถามเกี่ยวกับพิกัดศุลกากรหรืออัตราอากร");
        }

        // Rule 3: Short English-only (≤2 chars) → gibberish (Thai like "กุ้ง" is allowed)
        if (!hasThai && trimmed.length() <= 2) {
            log.warn("GUARD_BLOCK category=gibberish keyword='short_english' tenant={} query_prefix='{}'",
                    TenantContext.getCurrentTenantId(),
                    trimmed.substring(0, Math.min(50, trimmed.length())));
            return Optional.of("คำถามสั้นเกินไป กรุณาพิมพ์คำถามให้ชัดเจนขึ้น เช่น \"พิกัดกุ้งแช่แข็ง\" หรือ \"HS code 030617\"");
        }

        return Optional.empty();
    }

    private Optional<String> checkGreetingOrThanks(String query) {
        String trimmed = query.trim();
        if (trimmed.length() > 30) {
            return Optional.empty();
        }

        String lower = trimmed.toLowerCase();

        for (String greeting : GREETING_KEYWORDS) {
            if (lower.contains(greeting)) {
                log.info("Greeting detected: query='{}', tenant={}", trimmed, TenantContext.getCurrentTenantId());
                return Optional.of("สวัสดีครับ! ผมเป็นผู้ช่วย AI ด้านพิกัดศุลกากร ถามเกี่ยวกับ HS code อัตราอากร หรือ FTA ได้เลยครับ");
            }
        }

        for (String thanks : THANKS_KEYWORDS) {
            if (lower.contains(thanks)) {
                log.info("Thanks detected: query='{}', tenant={}", trimmed, TenantContext.getCurrentTenantId());
                return Optional.of("ยินดีครับ! หากมีคำถามเพิ่มเติมเกี่ยวกับพิกัดศุลกากร สามารถถามได้เลยครับ");
            }
        }

        return Optional.empty();
    }

    private Optional<String> checkMetaSupport(String query) {
        String lower = query.trim().toLowerCase();
        for (String keyword : META_SUPPORT_KEYWORDS) {
            if (lower.contains(keyword)) {
                log.info("Meta-support detected: keyword='{}', query='{}', tenant={}", keyword, query.trim(), TenantContext.getCurrentTenantId());
                return Optional.of(META_SUPPORT_RESPONSE);
            }
        }
        return Optional.empty();
    }

    private Optional<String> checkOffTopic(String query) {
        String q = query.toLowerCase();
        boolean hasCustoms = hasCustomsKeyword(query);

        // Strong off-topic keywords override customs keyword bypass
        for (String keyword : STRONG_OFF_TOPIC_KEYWORDS) {
            if (q.contains(keyword.toLowerCase())) {
                log.warn("GUARD_BLOCK category=off_topic keyword='{}' tenant={} query_prefix='{}'",
                        keyword, TenantContext.getCurrentTenantId(),
                        q.substring(0, Math.min(50, q.length())));
                return Optional.of("ระบบนี้ตอบได้เฉพาะคำถามเกี่ยวกับพิกัดศุลกากร อัตราอากร และกฎระเบียบนำเข้า-ส่งออก");
            }
        }

        // Regular off-topic: bypass if query contains customs keywords (e.g. "สูตรคำนวณภาษี")
        if (hasCustoms) {
            return Optional.empty();
        }
        for (String keyword : OFF_TOPIC_KEYWORDS) {
            if (q.contains(keyword.toLowerCase())) {
                log.warn("GUARD_BLOCK category=off_topic keyword='{}' tenant={} query_prefix='{}'",
                        keyword, TenantContext.getCurrentTenantId(),
                        q.substring(0, Math.min(50, q.length())));
                return Optional.of("ระบบนี้ตอบได้เฉพาะคำถามเกี่ยวกับพิกัดศุลกากร อัตราอากร และกฎระเบียบนำเข้า-ส่งออก");
            }
        }
        return Optional.empty();
    }
}
