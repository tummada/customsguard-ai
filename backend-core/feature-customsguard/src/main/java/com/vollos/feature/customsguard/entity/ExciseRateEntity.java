package com.vollos.feature.customsguard.entity;

import com.vollos.core.shared.BaseEntity;
import jakarta.persistence.*;

import java.math.BigDecimal;

@Entity
@Table(name = "cg_excise_rates")
public class ExciseRateEntity extends BaseEntity {

    @Column(name = "hs_code", nullable = false, length = 12)
    private String hsCode;

    @Column(name = "product_category", length = 100)
    private String productCategory;

    @Column(name = "excise_rate", precision = 6, scale = 2)
    private BigDecimal exciseRate;

    @Column(name = "excise_rate_specific", columnDefinition = "TEXT")
    private String exciseRateSpecific;

    @Column(name = "calculation_method", length = 20)
    private String calculationMethod;

    @Column(name = "conditions", columnDefinition = "TEXT")
    private String conditions;

    @Column(name = "source_url", columnDefinition = "TEXT")
    private String sourceUrl;

    protected ExciseRateEntity() {}

    public String getHsCode() { return hsCode; }
    public void setHsCode(String hsCode) { this.hsCode = hsCode; }
    public String getProductCategory() { return productCategory; }
    public void setProductCategory(String productCategory) { this.productCategory = productCategory; }
    public BigDecimal getExciseRate() { return exciseRate; }
    public void setExciseRate(BigDecimal exciseRate) { this.exciseRate = exciseRate; }
    public String getExciseRateSpecific() { return exciseRateSpecific; }
    public void setExciseRateSpecific(String exciseRateSpecific) { this.exciseRateSpecific = exciseRateSpecific; }
    public String getCalculationMethod() { return calculationMethod; }
    public void setCalculationMethod(String calculationMethod) { this.calculationMethod = calculationMethod; }
    public String getConditions() { return conditions; }
    public void setConditions(String conditions) { this.conditions = conditions; }
    public String getSourceUrl() { return sourceUrl; }
    public void setSourceUrl(String sourceUrl) { this.sourceUrl = sourceUrl; }
}
