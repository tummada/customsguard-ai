package com.vollos.feature.customsguard.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "cg_hs_codes")
public class HsCodeEntity {

    @Id
    @Column(length = 12)
    private String code;

    private Short section;

    private Short chapter;

    @Column(length = 6)
    private String heading;

    @Column(length = 8)
    private String subheading;

    @Column(name = "description_th")
    private String descriptionTh;

    @Column(name = "description_en")
    private String descriptionEn;

    @Column(name = "base_rate", precision = 6, scale = 2)
    private BigDecimal baseRate;

    @Column(length = 50)
    private String unit;

    @Column(length = 100)
    private String category;

    @Column(name = "embedded")
    private Boolean embedded = false;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    protected HsCodeEntity() {}

    public HsCodeEntity(String code) {
        this.code = code;
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public Short getSection() { return section; }
    public void setSection(Short section) { this.section = section; }
    public Short getChapter() { return chapter; }
    public void setChapter(Short chapter) { this.chapter = chapter; }
    public String getHeading() { return heading; }
    public void setHeading(String heading) { this.heading = heading; }
    public String getSubheading() { return subheading; }
    public void setSubheading(String subheading) { this.subheading = subheading; }
    public String getDescriptionTh() { return descriptionTh; }
    public void setDescriptionTh(String descriptionTh) { this.descriptionTh = descriptionTh; }
    public String getDescriptionEn() { return descriptionEn; }
    public void setDescriptionEn(String descriptionEn) { this.descriptionEn = descriptionEn; }
    public BigDecimal getBaseRate() { return baseRate; }
    public void setBaseRate(BigDecimal baseRate) { this.baseRate = baseRate; }
    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public Boolean getEmbedded() { return embedded; }
    public void setEmbedded(Boolean embedded) { this.embedded = embedded; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
}
