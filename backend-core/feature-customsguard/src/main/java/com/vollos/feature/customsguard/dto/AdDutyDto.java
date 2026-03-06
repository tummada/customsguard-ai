package com.vollos.feature.customsguard.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record AdDutyDto(
        String hsCode,
        String productNameTh,
        String originCountry,
        String dutyType,
        BigDecimal additionalRate,
        LocalDate effectiveFrom,
        String announcementNumber,
        String sourceUrl
) {}
