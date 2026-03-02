package com.vollos.feature.customsguard.dto;

import java.math.BigDecimal;

public record HsCodeResponse(
        String code,
        String descriptionTh,
        String descriptionEn,
        BigDecimal baseRate,
        String unit,
        String category,
        Short section,
        Short chapter
) {}
