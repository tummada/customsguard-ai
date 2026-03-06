package com.vollos.feature.customsguard.dto;

import java.math.BigDecimal;

public record ExciseRateDto(
        String hsCode,
        String productCategory,
        BigDecimal exciseRate,
        String exciseRateSpecific,
        String calculationMethod,
        String sourceUrl
) {}
