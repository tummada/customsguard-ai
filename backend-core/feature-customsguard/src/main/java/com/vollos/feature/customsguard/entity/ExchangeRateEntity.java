package com.vollos.feature.customsguard.entity;

import com.vollos.core.shared.BaseEntity;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "cg_exchange_rates")
public class ExchangeRateEntity extends BaseEntity {

    @Column(name = "currency_code", nullable = false, length = 3)
    private String currencyCode;

    @Column(name = "currency_name", length = 100)
    private String currencyName;

    @Column(name = "mid_rate", nullable = false, precision = 10, scale = 4)
    private BigDecimal midRate;

    @Column(name = "export_rate", precision = 10, scale = 4)
    private BigDecimal exportRate;

    @Column(name = "effective_date", nullable = false)
    private LocalDate effectiveDate;

    @Column(name = "source", length = 50)
    private String source;

    public ExchangeRateEntity() {}

    public String getCurrencyCode() { return currencyCode; }
    public void setCurrencyCode(String currencyCode) { this.currencyCode = currencyCode; }
    public String getCurrencyName() { return currencyName; }
    public void setCurrencyName(String currencyName) { this.currencyName = currencyName; }
    public BigDecimal getMidRate() { return midRate; }
    public void setMidRate(BigDecimal midRate) { this.midRate = midRate; }
    public BigDecimal getExportRate() { return exportRate; }
    public void setExportRate(BigDecimal exportRate) { this.exportRate = exportRate; }
    public LocalDate getEffectiveDate() { return effectiveDate; }
    public void setEffectiveDate(LocalDate effectiveDate) { this.effectiveDate = effectiveDate; }
    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
}
