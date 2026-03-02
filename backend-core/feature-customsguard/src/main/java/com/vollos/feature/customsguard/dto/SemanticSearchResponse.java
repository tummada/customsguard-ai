package com.vollos.feature.customsguard.dto;

import java.math.BigDecimal;

public record SemanticSearchResponse(
        String code,
        String descriptionTh,
        String descriptionEn,
        BigDecimal baseRate,
        String category,
        String unit,
        Double similarity
) {}
