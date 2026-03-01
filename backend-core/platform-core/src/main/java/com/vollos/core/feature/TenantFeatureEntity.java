package com.vollos.core.feature;

import com.vollos.core.shared.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "tenant_features")
public class TenantFeatureEntity extends BaseEntity {

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "feature_id", nullable = false, length = 50)
    private String featureId;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "subscribed_at")
    private Instant subscribedAt = Instant.now();

    @Column(name = "expires_at")
    private Instant expiresAt;

    protected TenantFeatureEntity() {}

    public TenantFeatureEntity(UUID tenantId, String featureId) {
        this.tenantId = tenantId;
        this.featureId = featureId;
    }

    public UUID getTenantId() { return tenantId; }
    public String getFeatureId() { return featureId; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public Instant getSubscribedAt() { return subscribedAt; }
    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }
}
