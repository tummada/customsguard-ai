package com.vollos.feature.customsguard.service;

import com.vollos.core.tenant.TenantContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Guards the RAG chat endpoint against abuse:
 * 1. Rate limiting per tenant (Redis sliding window)
 * 2. Prompt injection detection
 * 3. PII detection (Thai ID, phone, email)
 * 4. Off-topic query filtering
 */
@Service
public class ChatGuardService {

    private static final Logger log = LoggerFactory.getLogger(ChatGuardService.class);

    private static final int MAX_REQUESTS_PER_MINUTE = 5;
    private static final Duration WINDOW = Duration.ofMinutes(1);

    // Prompt injection patterns
    private static final List<Pattern> INJECTION_PATTERNS = List.of(
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
            Pattern.compile("(?i)###\\s*(system|instruction)")
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

    // Off-topic keywords (things clearly outside customs domain)
    private static final List<String> OFF_TOPIC_KEYWORDS = List.of(
            "เขียนโค้ด", "write code", "programming", "เขียนโปรแกรม",
            "แต่งเพลง", "write a song", "compose music",
            "แต่งกลอน", "write a poem",
            "เล่าเรื่อง", "tell me a story", "tell a joke", "เล่ามุก",
            "ทำอาหาร", "recipe", "สูตรอาหาร",
            "translate this to", "แปลภาษา"
    );

    private final StringRedisTemplate redisTemplate;

    public ChatGuardService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    /**
     * Run all guards on the query. Returns rejection message if blocked, empty if allowed.
     */
    public Optional<String> check(String query) {
        // 1. Rate limit
        Optional<String> rateLimit = checkRateLimit();
        if (rateLimit.isPresent()) return rateLimit;

        // 2. Prompt injection
        Optional<String> injection = checkPromptInjection(query);
        if (injection.isPresent()) return injection;

        // 3. PII detection
        Optional<String> pii = checkPii(query);
        if (pii.isPresent()) return pii;

        // 4. Off-topic
        Optional<String> offTopic = checkOffTopic(query);
        if (offTopic.isPresent()) return offTopic;

        return Optional.empty();
    }

    private Optional<String> checkRateLimit() {
        UUID tenantId = TenantContext.getCurrentTenantId();
        if (tenantId == null) return Optional.empty(); // shouldn't happen

        String key = "rag:rate:" + tenantId;
        try {
            Long count = redisTemplate.opsForValue().increment(key);
            if (count != null && count == 1) {
                redisTemplate.expire(key, WINDOW);
            }
            if (count != null && count > MAX_REQUESTS_PER_MINUTE) {
                log.warn("Rate limit exceeded for tenant {}: {}/min", tenantId, count);
                return Optional.of("คุณส่งคำถามเร็วเกินไป กรุณารอสักครู่แล้วลองใหม่ (จำกัด " + MAX_REQUESTS_PER_MINUTE + " ครั้ง/นาที)");
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
                log.warn("Prompt injection detected: pattern={}, tenant={}", pattern.pattern(), TenantContext.getCurrentTenantId());
                return Optional.of("ขออภัย ไม่สามารถประมวลผลคำถามนี้ได้ กรุณาถามเกี่ยวกับพิกัดศุลกากรหรืออัตราอากร");
            }
        }
        return Optional.empty();
    }

    private Optional<String> checkPii(String query) {
        for (Pattern pattern : PII_PATTERNS) {
            if (pattern.matcher(query).find()) {
                log.warn("PII detected in query, tenant={}", TenantContext.getCurrentTenantId());
                return Optional.of("กรุณาอย่าส่งข้อมูลส่วนบุคคล (เลขบัตรประชาชน, เบอร์โทร, อีเมล) ในช่องแชท");
            }
        }
        return Optional.empty();
    }

    private Optional<String> checkOffTopic(String query) {
        String q = query.toLowerCase();
        for (String keyword : OFF_TOPIC_KEYWORDS) {
            if (q.contains(keyword.toLowerCase())) {
                log.info("Off-topic query detected: keyword={}, tenant={}", keyword, TenantContext.getCurrentTenantId());
                return Optional.of("ระบบนี้ตอบได้เฉพาะคำถามเกี่ยวกับพิกัดศุลกากร อัตราอากร และกฎระเบียบนำเข้า-ส่งออก");
            }
        }
        return Optional.empty();
    }
}
