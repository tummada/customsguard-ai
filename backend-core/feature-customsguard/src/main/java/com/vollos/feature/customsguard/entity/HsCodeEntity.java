package com.vollos.feature.customsguard.entity;

import com.vollos.core.shared.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "cg_hs_codes")
public class HsCodeEntity extends BaseEntity {

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(nullable = false, length = 12)
    private String code;

    @Column(name = "description_th")
    private String descriptionTh;

    @Column(name = "description_en")
    private String descriptionEn;

    @Column(name = "duty_rate", precision = 5, scale = 2)
    private BigDecimal dutyRate;

    @Column(length = 100)
    private String category;

    @Column(name = "ai_confidence")
    private Short aiConfidence;

    @Column(name = "embedded")
    private Boolean embedded = false;

    protected HsCodeEntity() {}
    public HsCodeEntity(UUID tenantId) { this.tenantId = tenantId; }

    public UUID getTenantId() { return tenantId; }
    public void setTenantId(UUID tenantId) { this.tenantId = tenantId; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getDescriptionTh() { return descriptionTh; }
    public void setDescriptionTh(String descriptionTh) { this.descriptionTh = descriptionTh; }
    public String getDescriptionEn() { return descriptionEn; }
    public void setDescriptionEn(String descriptionEn) { this.descriptionEn = descriptionEn; }
    public BigDecimal getDutyRate() { return dutyRate; }
    public void setDutyRate(BigDecimal dutyRate) { this.dutyRate = dutyRate; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public Short getAiConfidence() { return aiConfidence; }
    public void setAiConfidence(Short aiConfidence) { this.aiConfidence = aiConfidence; }
    public Boolean getEmbedded() { return embedded; }
    public void setEmbedded(Boolean embedded) { this.embedded = embedded; }
}
