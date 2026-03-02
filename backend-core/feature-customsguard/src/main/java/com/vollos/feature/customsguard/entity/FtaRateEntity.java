package com.vollos.feature.customsguard.entity;

import com.vollos.core.shared.BaseEntity;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "cg_fta_rates")
public class FtaRateEntity extends BaseEntity {

    @Column(name = "hs_code", nullable = false, length = 12)
    private String hsCode;

    @Column(name = "fta_name", nullable = false, length = 100)
    private String ftaName;

    @Column(name = "partner_country", nullable = false, length = 3)
    private String partnerCountry;

    @Column(name = "preferential_rate", nullable = false, precision = 6, scale = 2)
    private BigDecimal preferentialRate;

    @Column(name = "form_type", length = 15)
    private String formType;

    private String conditions;

    @Column(name = "effective_from", nullable = false)
    private LocalDate effectiveFrom;

    @Column(name = "effective_to")
    private LocalDate effectiveTo;

    @Column(name = "source_url")
    private String sourceUrl;

    protected FtaRateEntity() {}

    public String getHsCode() { return hsCode; }
    public void setHsCode(String hsCode) { this.hsCode = hsCode; }
    public String getFtaName() { return ftaName; }
    public void setFtaName(String ftaName) { this.ftaName = ftaName; }
    public String getPartnerCountry() { return partnerCountry; }
    public void setPartnerCountry(String partnerCountry) { this.partnerCountry = partnerCountry; }
    public BigDecimal getPreferentialRate() { return preferentialRate; }
    public void setPreferentialRate(BigDecimal preferentialRate) { this.preferentialRate = preferentialRate; }
    public String getFormType() { return formType; }
    public void setFormType(String formType) { this.formType = formType; }
    public String getConditions() { return conditions; }
    public void setConditions(String conditions) { this.conditions = conditions; }
    public LocalDate getEffectiveFrom() { return effectiveFrom; }
    public void setEffectiveFrom(LocalDate effectiveFrom) { this.effectiveFrom = effectiveFrom; }
    public LocalDate getEffectiveTo() { return effectiveTo; }
    public void setEffectiveTo(LocalDate effectiveTo) { this.effectiveTo = effectiveTo; }
    public String getSourceUrl() { return sourceUrl; }
    public void setSourceUrl(String sourceUrl) { this.sourceUrl = sourceUrl; }
}
