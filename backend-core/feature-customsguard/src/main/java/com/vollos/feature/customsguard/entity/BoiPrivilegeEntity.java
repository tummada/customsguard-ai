package com.vollos.feature.customsguard.entity;

import com.vollos.core.shared.BaseEntity;
import jakarta.persistence.*;

import java.math.BigDecimal;

@Entity
@Table(name = "cg_boi_privileges")
public class BoiPrivilegeEntity extends BaseEntity {

    @Column(name = "activity_code", length = 20)
    private String activityCode;

    @Column(name = "activity_name_th", columnDefinition = "TEXT")
    private String activityNameTh;

    @Column(name = "activity_name_en", columnDefinition = "TEXT")
    private String activityNameEn;

    @Column(name = "privilege_type", nullable = false, length = 30)
    private String privilegeType;

    @Column(name = "section_ref", length = 20)
    private String sectionRef;

    @Column(name = "duty_reduction", precision = 6, scale = 2)
    private BigDecimal dutyReduction;

    @Column(name = "conditions", columnDefinition = "TEXT")
    private String conditions;

    @Column(name = "source_url", columnDefinition = "TEXT")
    private String sourceUrl;

    protected BoiPrivilegeEntity() {}

    public String getActivityCode() { return activityCode; }
    public void setActivityCode(String activityCode) { this.activityCode = activityCode; }
    public String getActivityNameTh() { return activityNameTh; }
    public void setActivityNameTh(String activityNameTh) { this.activityNameTh = activityNameTh; }
    public String getActivityNameEn() { return activityNameEn; }
    public void setActivityNameEn(String activityNameEn) { this.activityNameEn = activityNameEn; }
    public String getPrivilegeType() { return privilegeType; }
    public void setPrivilegeType(String privilegeType) { this.privilegeType = privilegeType; }
    public String getSectionRef() { return sectionRef; }
    public void setSectionRef(String sectionRef) { this.sectionRef = sectionRef; }
    public BigDecimal getDutyReduction() { return dutyReduction; }
    public void setDutyReduction(BigDecimal dutyReduction) { this.dutyReduction = dutyReduction; }
    public String getConditions() { return conditions; }
    public void setConditions(String conditions) { this.conditions = conditions; }
    public String getSourceUrl() { return sourceUrl; }
    public void setSourceUrl(String sourceUrl) { this.sourceUrl = sourceUrl; }
}
