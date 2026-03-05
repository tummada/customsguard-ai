package com.vollos.feature.customsguard.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RagSearchRequest(
        @NotBlank @Size(max = 500, message = "Query must not exceed 500 characters") String query,
        @Min(1) @Max(20) Integer limit
) {
    public RagSearchRequest {
        if (limit == null) limit = 5;
    }
}
