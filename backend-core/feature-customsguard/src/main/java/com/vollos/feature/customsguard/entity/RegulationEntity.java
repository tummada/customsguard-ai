package com.vollos.feature.customsguard.entity;

import com.vollos.core.shared.BaseEntity;
import jakarta.persistence.*;

import java.time.LocalDate;

@Entity
@Table(name = "cg_regulations")
public class RegulationEntity extends BaseEntity {

    @Column(name = "doc_type", nullable = false, length = 30)
    private String docType;

    @Column(name = "doc_number", length = 100)
    private String docNumber;

    @Column(nullable = false)
    private String title;

    @Column(length = 100)
    private String issuer;

    @Column(name = "issued_date")
    private LocalDate issuedDate;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "source_url")
    private String sourceUrl;

    @Column(name = "effective_date")
    private LocalDate effectiveDate;

    protected RegulationEntity() {}

    public String getDocType() { return docType; }
    public void setDocType(String docType) { this.docType = docType; }
    public String getDocNumber() { return docNumber; }
    public void setDocNumber(String docNumber) { this.docNumber = docNumber; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getIssuer() { return issuer; }
    public void setIssuer(String issuer) { this.issuer = issuer; }
    public LocalDate getIssuedDate() { return issuedDate; }
    public void setIssuedDate(LocalDate issuedDate) { this.issuedDate = issuedDate; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public String getSourceUrl() { return sourceUrl; }
    public void setSourceUrl(String sourceUrl) { this.sourceUrl = sourceUrl; }
    public LocalDate getEffectiveDate() { return effectiveDate; }
    public void setEffectiveDate(LocalDate effectiveDate) { this.effectiveDate = effectiveDate; }
}
