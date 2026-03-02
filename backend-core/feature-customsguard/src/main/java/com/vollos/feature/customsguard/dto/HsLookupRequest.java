package com.vollos.feature.customsguard.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record HsLookupRequest(
        @NotEmpty List<String> codes,
        @Size(max = 3) String originCountry
) {}
