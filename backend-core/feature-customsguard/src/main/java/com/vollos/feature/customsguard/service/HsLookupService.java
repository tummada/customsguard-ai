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
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

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
        // Batch-fetch all HS codes + FTA rates in 2 queries instead of N×6
        Map<String, HsCodeEntity> hsMap = hsCodeRepo.findAllById(codes).stream()
                .collect(Collectors.toMap(HsCodeEntity::getCode, h -> h));
        List<FtaRateEntity> allFtas = (originCountry != null && !originCountry.isBlank())
                ? ftaRateRepo.findActiveByHsCodesAndCountry(codes, originCountry)
                : ftaRateRepo.findActiveByHsCodes(codes);
        Map<String, List<FtaRateEntity>> ftaMap = allFtas.stream()
                .collect(Collectors.groupingBy(FtaRateEntity::getHsCode));

        return codes.stream()
                .map(code -> buildResponse(code, hsMap.get(code), ftaMap.getOrDefault(code, List.of())))
                .toList();
    }

    /** C5: Compute stale threshold dynamically so it updates after midnight */
    private static LocalDate staleThreshold() {
        return LocalDate.now().minusYears(2);
    }

    private HsLookupResponse buildResponse(String code, HsCodeEntity hs, List<FtaRateEntity> ftas) {
        if (hs == null) return HsLookupResponse.notFound(code);

        BigDecimal baseRate = hs.getBaseRate() != null ? hs.getBaseRate() : BigDecimal.ZERO;
        List<FtaAlertDto> ftaAlerts = ftas.stream()
                .filter(f -> f.getPreferentialRate().compareTo(baseRate) < 0)
                .map(f -> {
                    String warning = (f.getEffectiveFrom() != null && f.getEffectiveFrom().isBefore(staleThreshold()))
                            ? "⚠️ อัตรานี้อาจไม่เป็นปัจจุบัน (ข้อมูลจากปี " + f.getEffectiveFrom().getYear()
                              + ") กรุณาตรวจสอบที่ กรมศุลกากร customs.go.th" : null;
                    return new FtaAlertDto(f.getFtaName(), f.getPartnerCountry(), f.getFormType(),
                            f.getPreferentialRate(), baseRate.subtract(f.getPreferentialRate()),
                            f.getConditions(), f.getSourceUrl(), warning);
                })
                .toList();

        String normalized = code.trim().replaceAll("[^0-9]", "");
        List<LpiAlertDto> lpiAlerts = lpiControlRepo.findByHsCodePrefix(normalized).stream()
                .map(l -> new LpiAlertDto(l.getHsCode(), l.getControlType(), l.getAgencyCode(),
                        l.getAgencyNameTh(), l.getAgencyNameEn(), l.getRequirementTh(),
                        l.getRequirementEn(), l.getAppliesTo(), l.getSourceUrl()))
                .toList();
        List<AdDutyDto> adDuties = adDutyRepo.findActiveByHsCodePrefix(normalized).stream()
                .map(d -> new AdDutyDto(d.getHsCode(), d.getProductNameTh(), d.getOriginCountry(),
                        d.getDutyType(), d.getAdditionalRate(), d.getEffectiveFrom(),
                        d.getAnnouncementNumber(), d.getSourceUrl()))
                .toList();
        List<BoiPrivilegeDto> boiPrivileges = boiPrivilegeRepo.findByHsCodePrefix(normalized).stream()
                .map(b -> new BoiPrivilegeDto(b.getActivityCode(), b.getActivityNameTh(),
                        b.getPrivilegeType(), b.getSectionRef(), b.getDutyReduction(),
                        b.getConditions(), b.getSourceUrl()))
                .toList();
        List<ExciseRateDto> exciseRates = exciseRateRepo.findByHsCodePrefix(normalized).stream()
                .map(e -> new ExciseRateDto(e.getHsCode(), e.getProductCategory(), e.getExciseRate(),
                        e.getExciseRateSpecific(), e.getCalculationMethod(), e.getSourceUrl()))
                .toList();

        return new HsLookupResponse(code, hs.getDescriptionTh(), hs.getDescriptionEn(),
                hs.getBaseRate(), hs.getUnit(), ftaAlerts, lpiAlerts, adDuties,
                boiPrivileges, exciseRates, true);
    }

    @Cacheable(value = "hs-lookup", key = "T(com.vollos.core.tenant.TenantContext).getCurrentTenantId() + ':' + #code + ':' + #originCountry")
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
                .map(f -> {
                    String warning = (f.getEffectiveFrom() != null && f.getEffectiveFrom().isBefore(staleThreshold()))
                            ? "⚠️ อัตรานี้อาจไม่เป็นปัจจุบัน (ข้อมูลจากปี " + f.getEffectiveFrom().getYear()
                              + ") กรุณาตรวจสอบที่ กรมศุลกากร customs.go.th" : null;
                    return new FtaAlertDto(
                            f.getFtaName(),
                            f.getPartnerCountry(),
                            f.getFormType(),
                            f.getPreferentialRate(),
                            baseRate.subtract(f.getPreferentialRate()),
                            f.getConditions(),
                            f.getSourceUrl(),
                            warning);
                })
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
