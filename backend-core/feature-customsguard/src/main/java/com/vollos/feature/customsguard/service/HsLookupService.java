package com.vollos.feature.customsguard.service;

import com.vollos.feature.customsguard.dto.*;
import com.vollos.feature.customsguard.entity.FtaRateEntity;
import com.vollos.feature.customsguard.entity.HsCodeEntity;
import com.vollos.feature.customsguard.repository.*;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
public class HsLookupService {

    private final HsCodeRepository hsCodeRepo;
    private final FtaRateRepository ftaRateRepo;
    private final LpiControlRepository lpiControlRepo;
    private final AdDutyRepository adDutyRepo;
    private final BoiPrivilegeRepository boiPrivilegeRepo;
    private final ExciseRateRepository exciseRateRepo;
    private final HsLookupService self;

    public HsLookupService(HsCodeRepository hsCodeRepo, FtaRateRepository ftaRateRepo,
                            LpiControlRepository lpiControlRepo,
                            AdDutyRepository adDutyRepo,
                            BoiPrivilegeRepository boiPrivilegeRepo,
                            ExciseRateRepository exciseRateRepo,
                            @Lazy HsLookupService self) {
        this.hsCodeRepo = hsCodeRepo;
        this.ftaRateRepo = ftaRateRepo;
        this.lpiControlRepo = lpiControlRepo;
        this.adDutyRepo = adDutyRepo;
        this.boiPrivilegeRepo = boiPrivilegeRepo;
        this.exciseRateRepo = exciseRateRepo;
        this.self = self;
    }

    @Transactional(readOnly = true)
    public List<HsLookupResponse> batchLookup(List<String> codes, String originCountry) {
        return codes.stream()
                .map(code -> self.lookupSingleCode(code, originCountry))
                .toList();
    }

    @Cacheable(value = "hs-lookup", key = "#code + ':' + #originCountry")
    @Transactional(readOnly = true)
    public HsLookupResponse lookupSingleCode(String code, String originCountry) {
        HsCodeEntity hs = hsCodeRepo.findById(code).orElse(null);
        if (hs == null) {
            return HsLookupResponse.notFound(code);
        }

        List<FtaRateEntity> ftas = (originCountry != null && !originCountry.isBlank())
                ? ftaRateRepo.findActiveByHsCodeAndCountry(code, originCountry)
                : ftaRateRepo.findActiveByHsCode(code);

        BigDecimal baseRate = hs.getBaseRate() != null ? hs.getBaseRate() : BigDecimal.ZERO;

        List<FtaAlertDto> ftaAlerts = ftas.stream()
                .filter(f -> f.getPreferentialRate().compareTo(baseRate) < 0)
                .map(f -> new FtaAlertDto(
                        f.getFtaName(),
                        f.getPartnerCountry(),
                        f.getFormType(),
                        f.getPreferentialRate(),
                        baseRate.subtract(f.getPreferentialRate()),
                        f.getConditions(),
                        f.getSourceUrl()))
                .toList();

        String normalized = code.trim().replaceAll("[^0-9]", "");

        List<LpiAlertDto> lpiAlerts = lpiControlRepo.findByHsCodePrefix(normalized).stream()
                .map(l -> new LpiAlertDto(
                        l.getHsCode(),
                        l.getControlType(),
                        l.getAgencyCode(),
                        l.getAgencyNameTh(),
                        l.getAgencyNameEn(),
                        l.getRequirementTh(),
                        l.getRequirementEn(),
                        l.getAppliesTo(),
                        l.getSourceUrl()))
                .toList();

        List<AdDutyDto> adDuties = adDutyRepo.findActiveByHsCodePrefix(normalized).stream()
                .map(d -> new AdDutyDto(
                        d.getHsCode(),
                        d.getProductNameTh(),
                        d.getOriginCountry(),
                        d.getDutyType(),
                        d.getAdditionalRate(),
                        d.getEffectiveFrom(),
                        d.getAnnouncementNumber(),
                        d.getSourceUrl()))
                .toList();

        List<BoiPrivilegeDto> boiPrivileges = boiPrivilegeRepo.findByHsCodePrefix(normalized).stream()
                .map(b -> new BoiPrivilegeDto(
                        b.getActivityCode(),
                        b.getActivityNameTh(),
                        b.getPrivilegeType(),
                        b.getSectionRef(),
                        b.getDutyReduction(),
                        b.getConditions(),
                        b.getSourceUrl()))
                .toList();

        List<ExciseRateDto> exciseRates = exciseRateRepo.findByHsCodePrefix(normalized).stream()
                .map(e -> new ExciseRateDto(
                        e.getHsCode(),
                        e.getProductCategory(),
                        e.getExciseRate(),
                        e.getExciseRateSpecific(),
                        e.getCalculationMethod(),
                        e.getSourceUrl()))
                .toList();

        return new HsLookupResponse(
                code,
                hs.getDescriptionTh(),
                hs.getDescriptionEn(),
                hs.getBaseRate(),
                hs.getUnit(),
                ftaAlerts,
                lpiAlerts,
                adDuties,
                boiPrivileges,
                exciseRates,
                true);
    }
}
