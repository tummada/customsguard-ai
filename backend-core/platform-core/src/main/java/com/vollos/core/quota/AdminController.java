package com.vollos.core.quota;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

/**
 * Admin endpoint for upgrading tenant subscriptions.
 * Protected by X-Admin-Secret header.
 */
@RestController
@RequestMapping("/v1/admin")
public class AdminController {

    private static final Logger log = LoggerFactory.getLogger(AdminController.class);

    private final JdbcTemplate jdbcTemplate;
    private final String adminSecret;

    public AdminController(
            JdbcTemplate jdbcTemplate,
            @Value("${admin.secret:vollos-admin-secret-change-me}") String adminSecret) {
        this.jdbcTemplate = jdbcTemplate;
        this.adminSecret = adminSecret;
    }

    @PostMapping("/upgrade")
    public ResponseEntity<?> upgradeTenant(
            @RequestHeader(value = "X-Admin-Secret", required = false) String secret,
            @RequestBody Map<String, String> body) {

        // 1. Verify admin secret
        if (secret == null || !secret.equals(adminSecret)) {
            log.warn("Admin upgrade attempt with invalid secret");
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Invalid admin secret"));
        }

        // 2. Parse request
        String tenantIdStr = body.get("tenantId");
        String planId = body.get("planId");

        if (tenantIdStr == null || planId == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "tenantId and planId are required"));
        }

        UUID tenantId;
        try {
            tenantId = UUID.fromString(tenantIdStr);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Invalid tenantId format"));
        }

        // 3. Validate plan exists and get limits
        Map<String, Object> plan = jdbcTemplate.query(
                "SELECT id, scan_limit, chat_limit FROM subscription_plans WHERE id = ?",
                rs -> {
                    if (rs.next()) {
                        return Map.<String, Object>of(
                                "id", rs.getString("id"),
                                "scanLimit", rs.getInt("scan_limit"),
                                "chatLimit", rs.getInt("chat_limit"));
                    }
                    return null;
                },
                planId);

        if (plan == null) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "Plan not found: " + planId));
        }

        // 4. Update subscription (UPSERT in case subscription doesn't exist yet)
        int updated = jdbcTemplate.update(
                "UPDATE tenant_subscriptions SET plan_id = ?, updated_at = CURRENT_TIMESTAMP " +
                "WHERE tenant_id = ?",
                planId, tenantId);

        if (updated == 0) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "No subscription found for tenant: " + tenantIdStr));
        }

        log.info("Admin upgrade: tenant={}, plan={}", tenantId, planId);

        return ResponseEntity.ok(Map.of(
                "success", true,
                "tenantId", tenantIdStr,
                "planId", planId,
                "scanLimit", plan.get("scanLimit"),
                "chatLimit", plan.get("chatLimit")));
    }
}
