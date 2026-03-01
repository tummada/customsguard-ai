package com.vollos.core.tenant;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.UUID;

/**
 * Extracts X-Tenant-ID from the request header and sets it in {@link TenantContext}.
 * Must run before {@link com.vollos.core.feature.FeatureAccessInterceptor}.
 */
@Component
public class TenantInterceptor implements HandlerInterceptor {

    private static final String TENANT_HEADER = "X-Tenant-ID";

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response,
                             Object handler) throws Exception {
        String tenantHeader = request.getHeader(TENANT_HEADER);
        if (tenantHeader != null && !tenantHeader.isBlank()) {
            try {
                TenantContext.setCurrentTenantId(UUID.fromString(tenantHeader));
            } catch (IllegalArgumentException e) {
                response.setStatus(400);
                response.setContentType("application/problem+json");
                response.getWriter().write("""
                        {"type":"about:blank","title":"Bad Request","status":400,\
                        "detail":"Invalid X-Tenant-ID header format"}""");
                return false;
            }
        }
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response,
                                Object handler, Exception ex) {
        TenantContext.clear();
    }
}
