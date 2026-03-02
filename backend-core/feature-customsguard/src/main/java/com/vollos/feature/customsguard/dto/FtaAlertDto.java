package com.vollos.feature.customsguard.dto;

import java.math.BigDecimal;

public record FtaAlertDto(
        String ftaName,
        String partnerCountry,
        String formType,
        BigDecimal preferentialRate,
        BigDecimal savingPercent,
        String conditions
) {}
