package com.vollos.feature.customsguard.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record ExchangeRateDto(
        String currencyCode,
        String currencyName,
        BigDecimal midRate,
        BigDecimal exportRate,
        LocalDate effectiveDate,
        String source
) {}
