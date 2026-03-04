package com.vollos.feature.customsguard.dto;

public record RagChunkDto(
        String sourceType,
        String sourceId,
        String chunkText,
        String contentSummary,
        Double similarity,
        String sourceUrl,
        String docNumber,
        String docType,
        String title
) {}
