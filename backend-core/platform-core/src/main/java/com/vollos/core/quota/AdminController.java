package com.vollos.core.quota;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Admin endpoints for managing subscription plans and tenant upgrades.
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
            @Value("${admin.secret}") String adminSecret) {
        this.jdbcTemplate = jdbcTemplate;
        this.adminSecret = adminSecret;
    }

    public record UpgradeRequest(
            @NotBlank(message = "tenantId is required") String tenantId,
            @NotBlank(message = "planId is required") String planId) {}

    public record CreatePlanRequest(
            @NotBlank(message = "id is required") String id,
            @NotBlank(message = "displayName is required") String displayName,
            @NotNull(message = "scanLimit is required") @Min(0) Integer scanLimit,
            @NotNull(message = "chatLimit is required") @Min(0) Integer chatLimit,
            @NotNull(message = "priceThb is required") @Min(0) Integer priceThb) {}

    @PostMapping("/upgrade")
    public ResponseEntity<?> upgradeTenant(
            @RequestHeader(value = "X-Admin-Secret", required = false) String secret,
            @Valid @RequestBody UpgradeRequest body) {

        // 1. Verify admin secret
        if (!verifySecret(secret)) {
            return forbidden();
        }

        // 2. Parse request
        String tenantIdStr = body.tenantId();
        String planId = body.planId();

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

    // ── Plan Management ─────────────────────────────────────────────

    @GetMapping("/plans")
    public ResponseEntity<?> listPlans(
            @RequestHeader(value = "X-Admin-Secret", required = false) String secret) {

        if (!verifySecret(secret)) {
            return forbidden();
        }

        List<Map<String, Object>> plans = jdbcTemplate.queryForList(
                "SELECT id, display_name, scan_limit, chat_limit, price_thb, created_at, updated_at " +
                "FROM subscription_plans ORDER BY price_thb ASC");

        return ResponseEntity.ok(Map.of("plans", plans));
    }

    @PostMapping("/plans")
    public ResponseEntity<?> createPlan(
            @RequestHeader(value = "X-Admin-Secret", required = false) String secret,
            @Valid @RequestBody CreatePlanRequest body) {

        if (!verifySecret(secret)) {
            return forbidden();
        }

        String id = body.id();
        String displayName = body.displayName();
        Integer scanLimit = body.scanLimit();
        Integer chatLimit = body.chatLimit();
        Integer priceThb = body.priceThb();

        // Check duplicate
        Integer exists = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM subscription_plans WHERE id = ?", Integer.class, id);
        if (exists != null && exists > 0) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "Plan already exists: " + id));
        }

        jdbcTemplate.update(
                "INSERT INTO subscription_plans (id, display_name, scan_limit, chat_limit, price_thb) " +
                "VALUES (?, ?, ?, ?, ?)",
                id, displayName, scanLimit, chatLimit, priceThb);

        log.info("Admin created plan: id={}, scanLimit={}, chatLimit={}, priceThb={}",
                id, scanLimit, chatLimit, priceThb);

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "success", true,
                "id", id,
                "displayName", displayName,
                "scanLimit", scanLimit,
                "chatLimit", chatLimit,
                "priceThb", priceThb));
    }

    @PutMapping("/plans/{id}")
    public ResponseEntity<?> updatePlan(
            @RequestHeader(value = "X-Admin-Secret", required = false) String secret,
            @PathVariable String id,
            @RequestBody Map<String, Object> body) {

        if (!verifySecret(secret)) {
            return forbidden();
        }

        // Check plan exists
        Integer exists = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM subscription_plans WHERE id = ?", Integer.class, id);
        if (exists == null || exists == 0) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Plan not found: " + id));
        }

        // Build dynamic UPDATE (only provided fields)
        StringBuilder sql = new StringBuilder("UPDATE subscription_plans SET updated_at = CURRENT_TIMESTAMP");
        java.util.ArrayList<Object> params = new java.util.ArrayList<>();

        if (body.containsKey("displayName")) {
            sql.append(", display_name = ?");
            params.add(body.get("displayName"));
        }
        if (body.containsKey("scanLimit")) {
            sql.append(", scan_limit = ?");
            params.add(toInt(body.get("scanLimit")));
        }
        if (body.containsKey("chatLimit")) {
            sql.append(", chat_limit = ?");
            params.add(toInt(body.get("chatLimit")));
        }
        if (body.containsKey("priceThb")) {
            sql.append(", price_thb = ?");
            params.add(toInt(body.get("priceThb")));
        }

        if (params.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "No fields to update. Provide displayName, scanLimit, chatLimit, or priceThb"));
        }

        sql.append(" WHERE id = ?");
        params.add(id);

        jdbcTemplate.update(sql.toString(), params.toArray());

        log.info("Admin updated plan: id={}, fields={}", id, body.keySet());

        // Return updated plan
        Map<String, Object> updated = jdbcTemplate.queryForMap(
                "SELECT id, display_name, scan_limit, chat_limit, price_thb FROM subscription_plans WHERE id = ?", id);

        return ResponseEntity.ok(Map.of("success", true, "plan", updated));
    }

    // ── Helpers ──────────────────────────────────────────────────────

    private boolean verifySecret(String secret) {
        return secret != null && java.security.MessageDigest.isEqual(
                secret.getBytes(java.nio.charset.StandardCharsets.UTF_8),
                adminSecret.getBytes(java.nio.charset.StandardCharsets.UTF_8));
    }

    private ResponseEntity<?> forbidden() {
        log.warn("Admin request with invalid secret");
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("error", "Invalid admin secret"));
    }

    private static Integer toInt(Object value) {
        if (value == null) return null;
        if (value instanceof Integer i) return i;
        if (value instanceof Number n) return n.intValue();
        try {
            return Integer.parseInt(value.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
