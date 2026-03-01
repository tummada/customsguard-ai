package com.vollos.core.feature;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Set;
import java.util.UUID;

public interface TenantFeatureRepository extends JpaRepository<TenantFeatureEntity, UUID> {

    boolean existsByTenantIdAndFeatureIdAndActiveTrue(UUID tenantId, String featureId);

    @Query("""
        SELECT tf.featureId FROM TenantFeatureEntity tf
        WHERE tf.tenantId = :tenantId AND tf.active = true
        AND (tf.expiresAt IS NULL OR tf.expiresAt > CURRENT_TIMESTAMP)
        """)
    Set<String> findActiveFeatureIdsByTenantId(@Param("tenantId") UUID tenantId);
}
