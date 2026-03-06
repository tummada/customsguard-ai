package com.vollos.feature.customsguard.dto;

import java.math.BigDecimal;
import java.util.List;

public record HsLookupResponse(
        String code,
        String descriptionTh,
        String descriptionEn,
        BigDecimal baseRate,
        String unit,
        List<FtaAlertDto> ftaAlerts,
        List<LpiAlertDto> lpiAlerts,
        List<AdDutyDto> adDuties,
        List<BoiPrivilegeDto> boiPrivileges,
        List<ExciseRateDto> exciseRates,
        boolean found
) {
    public static HsLookupResponse notFound(String code) {
        return new HsLookupResponse(code, null, null, null, null,
                List.of(), List.of(), List.of(), List.of(), List.of(), false);
    }
}
