package com.vollos.feature.customsguard.entity;

import com.vollos.core.shared.BaseEntity;
import jakarta.persistence.*;

@Entity
@Table(name = "cg_lpi_controls")
public class LpiControlEntity extends BaseEntity {

    @Column(name = "hs_code", nullable = false, length = 12)
    private String hsCode;

    @Column(name = "control_type", nullable = false, length = 30)
    private String controlType;

    @Column(name = "agency_code", length = 20)
    private String agencyCode;

    @Column(name = "agency_name_th", length = 200)
    private String agencyNameTh;

    @Column(name = "agency_name_en", length = 200)
    private String agencyNameEn;

    @Column(name = "requirement_th", columnDefinition = "TEXT")
    private String requirementTh;

    @Column(name = "requirement_en", columnDefinition = "TEXT")
    private String requirementEn;

    @Column(name = "applies_to", length = 10)
    private String appliesTo;

    @Column(name = "source_url", columnDefinition = "TEXT")
    private String sourceUrl;

    protected LpiControlEntity() {}

    public String getHsCode() { return hsCode; }
    public void setHsCode(String hsCode) { this.hsCode = hsCode; }
    public String getControlType() { return controlType; }
    public void setControlType(String controlType) { this.controlType = controlType; }
    public String getAgencyCode() { return agencyCode; }
    public void setAgencyCode(String agencyCode) { this.agencyCode = agencyCode; }
    public String getAgencyNameTh() { return agencyNameTh; }
    public void setAgencyNameTh(String agencyNameTh) { this.agencyNameTh = agencyNameTh; }
    public String getAgencyNameEn() { return agencyNameEn; }
    public void setAgencyNameEn(String agencyNameEn) { this.agencyNameEn = agencyNameEn; }
    public String getRequirementTh() { return requirementTh; }
    public void setRequirementTh(String requirementTh) { this.requirementTh = requirementTh; }
    public String getRequirementEn() { return requirementEn; }
    public void setRequirementEn(String requirementEn) { this.requirementEn = requirementEn; }
    public String getAppliesTo() { return appliesTo; }
    public void setAppliesTo(String appliesTo) { this.appliesTo = appliesTo; }
    public String getSourceUrl() { return sourceUrl; }
    public void setSourceUrl(String sourceUrl) { this.sourceUrl = sourceUrl; }
}
