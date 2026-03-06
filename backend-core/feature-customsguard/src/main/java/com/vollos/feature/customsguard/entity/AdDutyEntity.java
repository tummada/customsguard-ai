package com.vollos.feature.customsguard.entity;

import com.vollos.core.shared.BaseEntity;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "cg_ad_duties")
public class AdDutyEntity extends BaseEntity {

    @Column(name = "hs_code", nullable = false, length = 12)
    private String hsCode;

    @Column(name = "product_name_th", columnDefinition = "TEXT")
    private String productNameTh;

    @Column(name = "product_name_en", columnDefinition = "TEXT")
    private String productNameEn;

    @Column(name = "origin_country", nullable = false, length = 3)
    private String originCountry;

    @Column(name = "duty_type", nullable = false, length = 10)
    private String dutyType;

    @Column(name = "additional_rate", nullable = false, precision = 6, scale = 2)
    private BigDecimal additionalRate;

    @Column(name = "effective_from", nullable = false)
    private LocalDate effectiveFrom;

    @Column(name = "effective_to")
    private LocalDate effectiveTo;

    @Column(name = "announcement_number", length = 100)
    private String announcementNumber;

    @Column(name = "source_url", columnDefinition = "TEXT")
    private String sourceUrl;

    protected AdDutyEntity() {}

    public String getHsCode() { return hsCode; }
    public void setHsCode(String hsCode) { this.hsCode = hsCode; }
    public String getProductNameTh() { return productNameTh; }
    public void setProductNameTh(String productNameTh) { this.productNameTh = productNameTh; }
    public String getProductNameEn() { return productNameEn; }
    public void setProductNameEn(String productNameEn) { this.productNameEn = productNameEn; }
    public String getOriginCountry() { return originCountry; }
    public void setOriginCountry(String originCountry) { this.originCountry = originCountry; }
    public String getDutyType() { return dutyType; }
    public void setDutyType(String dutyType) { this.dutyType = dutyType; }
    public BigDecimal getAdditionalRate() { return additionalRate; }
    public void setAdditionalRate(BigDecimal additionalRate) { this.additionalRate = additionalRate; }
    public LocalDate getEffectiveFrom() { return effectiveFrom; }
    public void setEffectiveFrom(LocalDate effectiveFrom) { this.effectiveFrom = effectiveFrom; }
    public LocalDate getEffectiveTo() { return effectiveTo; }
    public void setEffectiveTo(LocalDate effectiveTo) { this.effectiveTo = effectiveTo; }
    public String getAnnouncementNumber() { return announcementNumber; }
    public void setAnnouncementNumber(String announcementNumber) { this.announcementNumber = announcementNumber; }
    public String getSourceUrl() { return sourceUrl; }
    public void setSourceUrl(String sourceUrl) { this.sourceUrl = sourceUrl; }
}
