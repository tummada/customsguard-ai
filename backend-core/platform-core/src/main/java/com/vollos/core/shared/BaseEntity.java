package com.vollos.core.shared;

import jakarta.persistence.Column;
import jakarta.persistence.Id;
import jakarta.persistence.MappedSuperclass;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;

import java.time.Instant;
import java.util.UUID;

/**
 * Base entity with UUID v7 primary key and audit timestamps.
 * All entities in the platform should extend this class.
 */
@MappedSuperclass
public abstract class BaseEntity {

    @Id
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        if (this.id == null) {
            this.id = UUIDv7.generate();
        }
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
