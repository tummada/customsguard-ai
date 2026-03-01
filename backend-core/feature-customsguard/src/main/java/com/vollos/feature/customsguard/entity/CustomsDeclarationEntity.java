package com.vollos.feature.customsguard.entity;

import com.vollos.core.shared.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "cg_declarations")
public class CustomsDeclarationEntity extends BaseEntity {

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "declaration_number", length = 50)
    private String declarationNumber;

    @Column(name = "declaration_type", nullable = false, length = 20)
    private String declarationType; // IMPORT, EXPORT

    @Column(length = 30)
    private String status = "DRAFT";

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private String items = "[]";

    @Column(name = "total_duty", precision = 12, scale = 2)
    private BigDecimal totalDuty = BigDecimal.ZERO;

    @Column(name = "ai_job_id")
    private UUID aiJobId;

    protected CustomsDeclarationEntity() {}

    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
    public String getDeclarationNumber() { return declarationNumber; }
    public void setDeclarationNumber(String declarationNumber) { this.declarationNumber = declarationNumber; }
    public String getDeclarationType() { return declarationType; }
    public void setDeclarationType(String declarationType) { this.declarationType = declarationType; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getItems() { return items; }
    public void setItems(String items) { this.items = items; }
    public BigDecimal getTotalDuty() { return totalDuty; }
    public void setTotalDuty(BigDecimal totalDuty) { this.totalDuty = totalDuty; }
    public UUID getAiJobId() { return aiJobId; }
    public void setAiJobId(UUID aiJobId) { this.aiJobId = aiJobId; }
}
