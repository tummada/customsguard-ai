package com.vollos.core.tenant;

import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.util.UUID;

/**
 * AOP aspect that injects SET LOCAL app.current_tenant_id before JPA operations.
 * This ensures PostgreSQL RLS policies filter by the correct tenant.
 */
@Aspect
@Component
public class TenantConnectionInterceptor {

    private final DataSource dataSource;

    public TenantConnectionInterceptor(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Around("@annotation(org.springframework.transaction.annotation.Transactional)")
    public Object setTenantContext(ProceedingJoinPoint joinPoint) throws Throwable {
        UUID tenantId = TenantContext.getCurrentTenantId();
        if (tenantId != null) {
            try (Connection conn = dataSource.getConnection()) {
                try (var stmt = conn.prepareStatement(
                        "SELECT set_config('app.current_tenant_id', ?, true)")) {
                    stmt.setString(1, tenantId.toString());
                    stmt.execute();
                }
            }
        }
        return joinPoint.proceed();
    }
}
