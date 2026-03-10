package com.vollos.feature.customsguard.dto;

import java.math.BigDecimal;

public record TaxCalculationResponse(
        BigDecimal cifAmount,
        BigDecimal dutyRatePercent,
        BigDecimal dutyAmount,
        BigDecimal exciseAmount,
        BigDecimal municipalTaxAmount,
        BigDecimal vatBase,
        BigDecimal vatAmount,
        BigDecimal totalTaxDue,
        String note
) {}
