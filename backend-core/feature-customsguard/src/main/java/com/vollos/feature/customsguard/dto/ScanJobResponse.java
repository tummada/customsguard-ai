package com.vollos.feature.customsguard.dto;

import java.util.List;
import java.util.UUID;

public record ScanJobResponse(
        UUID jobId,
        String status,
        Short progress,
        String s3Key,
        List<ExtractedItem> items
) {
    public ScanJobResponse(UUID jobId, String status, Short progress, String s3Key) {
        this(jobId, status, progress, s3Key, null);
    }

    public record ExtractedItem(
            String hsCode,
            String descriptionTh,
            String descriptionEn,
            String quantity,
            String weight,
            String unitPrice,
            String cifPrice,
            String currency,
            double confidence,
            String aiReason,
            int sourcePageIndex
    ) {}
}
