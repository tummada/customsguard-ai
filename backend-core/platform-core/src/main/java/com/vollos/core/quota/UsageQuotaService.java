package com.vollos.core.quota;

import com.vollos.core.shared.UUIDv7;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.UUID;

/**
 * Manages usage quotas for tenants based on their subscription plan.
 * Uses JdbcTemplate for atomic UPSERT operations on tenant_usage.
 */
@Service
public class UsageQuotaService {

    private static final Logger log = LoggerFactory.getLogger(UsageQuotaService.class);
    private static final DateTimeFormatter PERIOD_FORMAT = DateTimeFormatter.ofPattern("yyyy-MM");

    private final JdbcTemplate jdbcTemplate;

    public UsageQuotaService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * Atomically increment usage and check against plan limits.
     * @param tenantId the tenant
     * @param usageType "scan" or "chat"
     * @return remaining count after increment
     * @throws QuotaExceededException if over limit
     */
    @Transactional
    public int checkAndIncrement(UUID tenantId, String usageType) {
        String period = YearMonth.now().format(PERIOD_FORMAT);

        // 1. Get plan limits for this tenant
        PlanLimits limits = getPlanLimits(tenantId);
        if (limits == null) {
            log.warn("No subscription found for tenant={}, defaulting to FREE limits", tenantId);
            limits = new PlanLimits("FREE", 10, 3);
        }

        int maxLimit = "scan".equals(usageType) ? limits.scanLimit : limits.chatLimit;
        String countColumn = "scan".equals(usageType) ? "scan_count" : "chat_count";

        // 2. UPSERT: insert or increment atomically, return new count
        // Note: tenant_usage has RLS, but we set tenant context via TenantConnectionInterceptor
        Integer newCount = jdbcTemplate.queryForObject(
                "INSERT INTO tenant_usage (id, tenant_id, period, " + countColumn + ") " +
                "VALUES (?, ?, ?, 1) " +
                "ON CONFLICT (tenant_id, period) DO UPDATE SET " +
                countColumn + " = tenant_usage." + countColumn + " + 1, " +
                "updated_at = CURRENT_TIMESTAMP " +
                "RETURNING " + countColumn,
                Integer.class,
                UUIDv7.generate(), tenantId, period);

        if (newCount == null) newCount = 1;

        log.info("Usage increment: tenant={}, type={}, period={}, count={}/{}",
                tenantId, usageType, period, newCount, maxLimit);

        // 3. Check if over limit (we already incremented, so check >)
        if (newCount > maxLimit) {
            throw new QuotaExceededException(usageType, newCount, maxLimit, limits.planId);
        }

        return maxLimit - newCount;
    }

    /**
     * Get current usage + limits for a tenant (read-only, for display).
     */
    public Map<String, Object> getUsage(UUID tenantId) {
        String period = YearMonth.now().format(PERIOD_FORMAT);

        PlanLimits limits = getPlanLimits(tenantId);
        if (limits == null) {
            limits = new PlanLimits("FREE", 10, 3);
        }

        // Get current counts (may not exist yet if no usage this period)
        Map<String, Object> counts = jdbcTemplate.query(
                "SELECT scan_count, chat_count FROM tenant_usage " +
                "WHERE tenant_id = ? AND period = ?",
                rs -> {
                    if (rs.next()) {
                        return Map.<String, Object>of(
                                "scanUsed", rs.getInt("scan_count"),
                                "chatUsed", rs.getInt("chat_count"));
                    }
                    return Map.<String, Object>of("scanUsed", 0, "chatUsed", 0);
                },
                tenantId, period);

        return Map.of(
                "plan", limits.planId,
                "period", period,
                "scan", Map.of(
                        "used", counts.get("scanUsed"),
                        "limit", limits.scanLimit),
                "chat", Map.of(
                        "used", counts.get("chatUsed"),
                        "limit", limits.chatLimit));
    }

    private PlanLimits getPlanLimits(UUID tenantId) {
        return jdbcTemplate.query(
                "SELECT sp.id AS plan_id, sp.scan_limit, sp.chat_limit " +
                "FROM tenant_subscriptions ts " +
                "JOIN subscription_plans sp ON sp.id = ts.plan_id " +
                "WHERE ts.tenant_id = ?",
                rs -> {
                    if (rs.next()) {
                        return new PlanLimits(
                                rs.getString("plan_id"),
                                rs.getInt("scan_limit"),
                                rs.getInt("chat_limit"));
                    }
                    return null;
                },
                tenantId);
    }

    private record PlanLimits(String planId, int scanLimit, int chatLimit) {}
}
