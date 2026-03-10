package com.vollos.feature.customsguard.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record TaxCalculationRequest(
        @NotNull @DecimalMin("0") BigDecimal cifAmount,
        @NotNull @DecimalMin("0") BigDecimal dutyRatePercent,
        String currency,
        String hsCode,
        BigDecimal quantity
) {
    public TaxCalculationRequest {
        if (currency == null) currency = "THB";
    }
}
