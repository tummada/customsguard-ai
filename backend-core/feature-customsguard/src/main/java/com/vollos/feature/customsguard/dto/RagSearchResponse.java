package com.vollos.feature.customsguard.dto;

import java.util.List;

public record RagSearchResponse(
        String answer,
        List<RagChunkDto> sources,
        long processingTimeMs
) {}
