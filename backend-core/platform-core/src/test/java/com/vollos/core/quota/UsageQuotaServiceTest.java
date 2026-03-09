package com.vollos.core.quota;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.ResultSetExtractor;

import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * TC-BE-032 ~ TC-BE-037: UsageQuotaService tests.
 */
@ExtendWith(MockitoExtension.class)
class UsageQuotaServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    private UsageQuotaService service;

    private static final UUID TENANT_ID = UUID.randomUUID();
    private static final String CURRENT_PERIOD = YearMonth.now().format(DateTimeFormatter.ofPattern("yyyy-MM"));

    @BeforeEach
    void setUp() {
        service = new UsageQuotaService(jdbcTemplate);
    }

    private void mockPlanLimits(String planId, int scanLimit, int chatLimit) {
        // getPlanLimits uses jdbcTemplate.query with ResultSetExtractor
        when(jdbcTemplate.query(
                contains("tenant_subscriptions"),
                any(ResultSetExtractor.class),
                eq(TENANT_ID)))
                .thenAnswer(invocation -> {
                    // We can't easily mock ResultSetExtractor, so we use a different approach:
                    // Return a PlanLimits-like value by mocking at a higher level
                    return null; // Will trigger default FREE limits
                });
    }

    @Test
    @DisplayName("TC-BE-032: checkAndIncrement scan — ใช้ยังไม่เกิน quota → คืน remaining")
    void checkAndIncrement_scan_withinQuota_shouldReturnRemaining() {
        // Mock: no subscription found → defaults to FREE (scan=10, chat=3)
        when(jdbcTemplate.query(contains("tenant_subscriptions"), any(ResultSetExtractor.class), eq(TENANT_ID)))
                .thenReturn(null);

        // Mock UPSERT returns new count = 3
        when(jdbcTemplate.queryForObject(contains("INSERT INTO tenant_usage"), eq(Integer.class),
                any(UUID.class), eq(TENANT_ID), eq(CURRENT_PERIOD)))
                .thenReturn(3);

        int remaining = service.checkAndIncrement(TENANT_ID, "scan");

        // FREE plan scan limit = 10, used = 3, remaining = 7
        assertThat(remaining).isEqualTo(7);
    }

    @Test
    @DisplayName("TC-BE-033: checkAndIncrement chat — ใช้ยังไม่เกิน quota → คืน remaining")
    void checkAndIncrement_chat_withinQuota_shouldReturnRemaining() {
        when(jdbcTemplate.query(contains("tenant_subscriptions"), any(ResultSetExtractor.class), eq(TENANT_ID)))
                .thenReturn(null);

        // Mock UPSERT returns new count = 1
        when(jdbcTemplate.queryForObject(contains("INSERT INTO tenant_usage"), eq(Integer.class),
                any(UUID.class), eq(TENANT_ID), eq(CURRENT_PERIOD)))
                .thenReturn(1);

        int remaining = service.checkAndIncrement(TENANT_ID, "chat");

        // FREE plan chat limit = 3, used = 1, remaining = 2
        assertThat(remaining).isEqualTo(2);
    }

    @Test
    @DisplayName("TC-BE-034: checkAndIncrement — เกิน quota → throw QuotaExceededException")
    void checkAndIncrement_overQuota_shouldThrow() {
        when(jdbcTemplate.query(contains("tenant_subscriptions"), any(ResultSetExtractor.class), eq(TENANT_ID)))
                .thenReturn(null);

        // Mock UPSERT returns count = 11 (exceeds FREE scan limit of 10)
        when(jdbcTemplate.queryForObject(contains("INSERT INTO tenant_usage"), eq(Integer.class),
                any(UUID.class), eq(TENANT_ID), eq(CURRENT_PERIOD)))
                .thenReturn(11);

        assertThatThrownBy(() -> service.checkAndIncrement(TENANT_ID, "scan"))
                .isInstanceOf(QuotaExceededException.class)
                .satisfies(ex -> {
                    QuotaExceededException qe = (QuotaExceededException) ex;
                    assertThat(qe.getUsageType()).isEqualTo("scan");
                    assertThat(qe.getCurrentCount()).isEqualTo(11);
                    assertThat(qe.getLimit()).isEqualTo(10);
                    assertThat(qe.getPlanId()).isEqualTo("FREE");
                });
    }

    @Test
    @DisplayName("TC-BE-035: checkAndIncrement — พอดี limit (count == limit) → ไม่ throw")
    void checkAndIncrement_atExactLimit_shouldNotThrow() {
        when(jdbcTemplate.query(contains("tenant_subscriptions"), any(ResultSetExtractor.class), eq(TENANT_ID)))
                .thenReturn(null);

        // count = 10, limit = 10, 10 > 10 is false → should pass
        when(jdbcTemplate.queryForObject(contains("INSERT INTO tenant_usage"), eq(Integer.class),
                any(UUID.class), eq(TENANT_ID), eq(CURRENT_PERIOD)))
                .thenReturn(10);

        int remaining = service.checkAndIncrement(TENANT_ID, "scan");

        assertThat(remaining).isEqualTo(0);
    }

    @Test
    @DisplayName("TC-BE-036: getUsage — คืนข้อมูล usage ที่ถูกต้อง (default FREE)")
    void getUsage_shouldReturnUsageInfo() {
        // No subscription
        when(jdbcTemplate.query(contains("tenant_subscriptions"), any(ResultSetExtractor.class), eq(TENANT_ID)))
                .thenReturn(null);

        // Usage query returns counts
        when(jdbcTemplate.query(contains("SELECT scan_count"), any(ResultSetExtractor.class),
                eq(TENANT_ID), eq(CURRENT_PERIOD)))
                .thenReturn(Map.of("scanUsed", 5, "chatUsed", 2));

        Map<String, Object> usage = service.getUsage(TENANT_ID);

        assertThat(usage.get("plan")).isEqualTo("FREE");
        assertThat(usage.get("period")).isEqualTo(CURRENT_PERIOD);
    }

    @Test
    @DisplayName("TC-BE-037: getUsage — ไม่มี usage record → scanUsed=0, chatUsed=0")
    void getUsage_withNoRecords_shouldReturnZeros() {
        when(jdbcTemplate.query(contains("tenant_subscriptions"), any(ResultSetExtractor.class), eq(TENANT_ID)))
                .thenReturn(null);

        when(jdbcTemplate.query(contains("SELECT scan_count"), any(ResultSetExtractor.class),
                eq(TENANT_ID), eq(CURRENT_PERIOD)))
                .thenReturn(Map.of("scanUsed", 0, "chatUsed", 0));

        Map<String, Object> usage = service.getUsage(TENANT_ID);

        assertThat(usage.get("plan")).isEqualTo("FREE");
        @SuppressWarnings("unchecked")
        Map<String, Object> scan = (Map<String, Object>) usage.get("scan");
        assertThat(scan.get("used")).isEqualTo(0);
        assertThat(scan.get("limit")).isEqualTo(10);
    }
}
