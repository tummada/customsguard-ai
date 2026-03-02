package com.vollos.feature.customsguard.service;

import com.vollos.feature.customsguard.dto.FtaAlertDto;
import com.vollos.feature.customsguard.dto.HsLookupResponse;
import com.vollos.feature.customsguard.entity.FtaRateEntity;
import com.vollos.feature.customsguard.entity.HsCodeEntity;
import com.vollos.feature.customsguard.repository.FtaRateRepository;
import com.vollos.feature.customsguard.repository.HsCodeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
public class HsLookupService {

    private final HsCodeRepository hsCodeRepo;
    private final FtaRateRepository ftaRateRepo;

    public HsLookupService(HsCodeRepository hsCodeRepo, FtaRateRepository ftaRateRepo) {
        this.hsCodeRepo = hsCodeRepo;
        this.ftaRateRepo = ftaRateRepo;
    }

    @Transactional(readOnly = true)
    public List<HsLookupResponse> batchLookup(List<String> codes, String originCountry) {
        return codes.stream().map(code -> {
            HsCodeEntity hs = hsCodeRepo.findById(code).orElse(null);
            if (hs == null) {
                return HsLookupResponse.notFound(code);
            }

            List<FtaRateEntity> ftas = (originCountry != null && !originCountry.isBlank())
                    ? ftaRateRepo.findActiveByHsCodeAndCountry(code, originCountry)
                    : ftaRateRepo.findActiveByHsCode(code);

            BigDecimal baseRate = hs.getBaseRate() != null ? hs.getBaseRate() : BigDecimal.ZERO;

            List<FtaAlertDto> alerts = ftas.stream()
                    .filter(f -> f.getPreferentialRate().compareTo(baseRate) < 0)
                    .map(f -> new FtaAlertDto(
                            f.getFtaName(),
                            f.getPartnerCountry(),
                            f.getFormType(),
                            f.getPreferentialRate(),
                            baseRate.subtract(f.getPreferentialRate()),
                            f.getConditions()))
                    .toList();

            return new HsLookupResponse(
                    code,
                    hs.getDescriptionTh(),
                    hs.getDescriptionEn(),
                    hs.getBaseRate(),
                    hs.getUnit(),
                    alerts,
                    true);
        }).toList();
    }
}
