package com.vollos.feature.customsguard.dto;

import java.util.UUID;

public record ScanJobResponse(
        UUID jobId,
        String status,
        Short progress,
        String s3Key
) {}
