package com.vollos.feature.customsguard.dto;

public record RagChunkDto(
        String sourceType,
        String sourceId,
        String chunkText,
        String contentSummary,
        Double similarity
) {}
