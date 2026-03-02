package com.vollos.feature.customsguard.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record RagSearchRequest(
        @NotBlank String query,
        @Min(1) @Max(20) Integer limit
) {
    public RagSearchRequest {
        if (limit == null) limit = 5;
    }
}
