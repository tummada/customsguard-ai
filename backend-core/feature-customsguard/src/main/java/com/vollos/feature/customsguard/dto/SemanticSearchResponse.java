package com.vollos.feature.customsguard.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record SemanticSearchResponse(
        UUID id,
        String code,
        String descriptionTh,
        String descriptionEn,
        BigDecimal dutyRate,
        String category,
        Short aiConfidence,
        Double similarity
) {}
