package com.vollos.core.tenant;

import java.util.UUID;

/**
 * Holds the current tenant ID for the ongoing request.
 * Uses ThreadLocal (compatible with Virtual Threads when using carrier-thread pinning avoidance).
 */
public final class TenantContext {

    private static final ThreadLocal<UUID> CURRENT_TENANT = new ThreadLocal<>();

    private TenantContext() {}

    public static UUID getCurrentTenantId() {
        return CURRENT_TENANT.get();
    }

    public static void setCurrentTenantId(UUID tenantId) {
        CURRENT_TENANT.set(tenantId);
    }

    public static void clear() {
        CURRENT_TENANT.remove();
    }
}
