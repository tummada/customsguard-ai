package com.vollos.core.feature;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.vollos.core.tenant.TenantContext;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

import java.time.Duration;
import java.util.UUID;

/**
 * Intercepts requests to controllers annotated with {@link RequiresFeature}
 * and checks that the current tenant has an active subscription.
 * Uses a local Caffeine cache (60s TTL) to avoid hitting the DB on every request.
 */
@Component
public class FeatureAccessInterceptor implements HandlerInterceptor {

    private final TenantFeatureRepository tenantFeatureRepo;

    private final Cache<String, Boolean> accessCache = Caffeine.newBuilder()
            .expireAfterWrite(Duration.ofSeconds(60))
            .maximumSize(10_000)
            .build();

    public FeatureAccessInterceptor(TenantFeatureRepository tenantFeatureRepo) {
        this.tenantFeatureRepo = tenantFeatureRepo;
    }

    @Override
    public boolean preHandle(HttpServletRequest req, HttpServletResponse resp,
                             Object handler) throws Exception {
        if (!(handler instanceof HandlerMethod hm)) {
            return true;
        }

        RequiresFeature rf = hm.getMethodAnnotation(RequiresFeature.class);
        if (rf == null) {
            rf = hm.getBeanType().getAnnotation(RequiresFeature.class);
        }
        if (rf == null) {
            return true;
        }

        final String featureId = rf.value();
        UUID tenantId = TenantContext.getCurrentTenantId();
        if (tenantId == null) {
            resp.setStatus(401);
            resp.setContentType("application/problem+json");
            resp.getWriter().write("""
                    {"type":"about:blank","title":"Unauthorized","status":401,\
                    "detail":"Tenant context not set"}""");
            return false;
        }

        String cacheKey = tenantId + ":" + featureId;
        Boolean hasAccess = accessCache.get(cacheKey, k ->
                tenantFeatureRepo.existsByTenantIdAndFeatureIdAndActiveTrue(tenantId, featureId));

        if (!Boolean.TRUE.equals(hasAccess)) {
            resp.setStatus(403);
            resp.setContentType("application/problem+json");
            resp.getWriter().write("""
                    {"type":"about:blank","title":"Feature Not Subscribed","status":403,\
                    "detail":"Tenant has not subscribed to feature: %s"}"""
                    .formatted(featureId));
            return false;
        }

        return true;
    }
}
