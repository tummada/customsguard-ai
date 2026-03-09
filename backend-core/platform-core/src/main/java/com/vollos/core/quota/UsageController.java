package com.vollos.core.quota;

import com.vollos.core.tenant.TenantContext;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

/**
 * Endpoint for the Chrome Extension to check remaining quota.
 */
@RestController
@RequestMapping("/v1/usage")
public class UsageController {

    private final UsageQuotaService usageQuotaService;

    public UsageController(UsageQuotaService usageQuotaService) {
        this.usageQuotaService = usageQuotaService;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> getUsage() {
        UUID tenantId = TenantContext.getCurrentTenantId();
        if (tenantId == null) {
            return ResponseEntity.status(403).build();
        }
        return ResponseEntity.ok(usageQuotaService.getUsage(tenantId));
    }
}
