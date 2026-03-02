package com.vollos.feature.customsguard.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public record SemanticSearchRequest(
        @NotBlank String query,
        @Min(1) @Max(50) Integer limit
) {
    public SemanticSearchRequest {
        if (limit == null) limit = 10;
    }
}
