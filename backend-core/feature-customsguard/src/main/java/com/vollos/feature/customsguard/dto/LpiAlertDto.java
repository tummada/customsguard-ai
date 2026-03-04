package com.vollos.feature.customsguard.dto;

public record LpiAlertDto(
        String hsCode,
        String controlType,
        String agencyCode,
        String agencyNameTh,
        String agencyNameEn,
        String requirementTh,
        String requirementEn,
        String appliesTo,
        String sourceUrl
) {}
