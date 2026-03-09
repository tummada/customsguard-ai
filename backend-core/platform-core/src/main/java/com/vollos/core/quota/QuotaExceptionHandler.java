package com.vollos.core.quota;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import java.util.Map;

/**
 * Global exception handler for quota exceeded errors.
 * Returns HTTP 429 with plan info and upgrade URL.
 */
@ControllerAdvice
public class QuotaExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(QuotaExceptionHandler.class);

    @ExceptionHandler(QuotaExceededException.class)
    public ResponseEntity<Map<String, Object>> handleQuotaExceeded(QuotaExceededException ex) {
        log.warn("Quota exceeded: type={}, count={}, limit={}, plan={}",
                ex.getUsageType(), ex.getCurrentCount(), ex.getLimit(), ex.getPlanId());

        return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(Map.of(
                "error", "QUOTA_EXCEEDED",
                "usageType", ex.getUsageType(),
                "current", ex.getCurrentCount(),
                "limit", ex.getLimit(),
                "plan", ex.getPlanId(),
                "message", "คุณใช้งานครบโควต้าแล้ว อัพเกรดเป็น PRO เพื่อใช้งานเพิ่ม",
                "upgradeUrl", "/pricing"));
    }
}
