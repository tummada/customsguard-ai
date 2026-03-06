package com.vollos.feature.customsguard.dto;

import java.math.BigDecimal;

public record BoiPrivilegeDto(
        String activityCode,
        String activityNameTh,
        String privilegeType,
        String sectionRef,
        BigDecimal dutyReduction,
        String conditions,
        String sourceUrl
) {}
