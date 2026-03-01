package com.vollos.core.feature;

import com.vollos.core.tenant.TenantContext;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Returns the list of installed features with subscription status for the current tenant.
 * The Angular frontend calls this on app init to build the dynamic sidebar.
 */
@RestController
@RequestMapping("/v1/features")
public class FeatureController {

    private final FeatureRegistry registry;
    private final TenantFeatureRepository tenantFeatureRepo;

    public FeatureController(FeatureRegistry registry,
                             TenantFeatureRepository tenantFeatureRepo) {
        this.registry = registry;
        this.tenantFeatureRepo = tenantFeatureRepo;
    }

    @GetMapping
    public List<FeatureInfoDto> getFeatures() {
        UUID tenantId = TenantContext.getCurrentTenantId();
        Set<String> subscribedIds = tenantId != null
                ? tenantFeatureRepo.findActiveFeatureIdsByTenantId(tenantId)
                : Set.of();

        return registry.getAllFeatures().stream()
                .map(fd -> new FeatureInfoDto(
                        fd.getFeatureId(),
                        fd.getDisplayName(),
                        fd.getDescription(),
                        fd.getApiPrefix(),
                        subscribedIds.contains(fd.getFeatureId())
                ))
                .toList();
    }

    public record FeatureInfoDto(
            String featureId,
            String displayName,
            String description,
            String apiPrefix,
            boolean subscribed
    ) {}
}
