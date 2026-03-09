package com.vollos.feature.customsguard.service;

import com.vollos.feature.customsguard.dto.HsLookupResponse;
import com.vollos.feature.customsguard.entity.*;
import com.vollos.feature.customsguard.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * Unit tests for HsLookupService.
 * TC-CG-070 to TC-CG-082
 *
 * Note: HsLookupService uses @Lazy self-injection for @Cacheable proxy.
 * In unit tests we pass a real instance as 'self' (cache proxy bypassed).
 * Entities with protected constructors are created via Mockito stubs.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class HsLookupServiceTest {

    @Mock
    private HsCodeRepository hsCodeRepo;
    @Mock
    private FtaRateRepository ftaRateRepo;
    @Mock
    private LpiControlRepository lpiControlRepo;
    @Mock
    private AdDutyRepository adDutyRepo;
    @Mock
    private BoiPrivilegeRepository boiPrivilegeRepo;
    @Mock
    private ExciseRateRepository exciseRateRepo;

    private HsLookupService hsLookupService;

    @BeforeEach
    void setUp() {
        // First create an instance that will serve as the 'self' proxy target.
        // Then create the actual instance whose batchLookup calls self.lookupSingleCode.
        HsLookupService selfTarget = new HsLookupService(
                hsCodeRepo, ftaRateRepo, lpiControlRepo,
                adDutyRepo, boiPrivilegeRepo, exciseRateRepo, null);
        // Now create the real instance with self = selfTarget
        hsLookupService = new HsLookupService(
                hsCodeRepo, ftaRateRepo, lpiControlRepo,
                adDutyRepo, boiPrivilegeRepo, exciseRateRepo, selfTarget);
    }

    // --- helpers: use Mockito stubs for entities with protected constructors ---

    private HsCodeEntity buildHsEntity(String code, String descTh, String descEn,
                                        BigDecimal baseRate) {
        // HsCodeEntity has public constructor HsCodeEntity(String code)
        HsCodeEntity e = new HsCodeEntity(code);
        e.setDescriptionTh(descTh);
        e.setDescriptionEn(descEn);
        e.setBaseRate(baseRate);
        e.setUnit("KG");
        return e;
    }

    private FtaRateEntity buildFtaRate(String hsCode, String ftaName, String country,
                                        BigDecimal prefRate, String formType) {
        FtaRateEntity f = mock(FtaRateEntity.class);
        when(f.getHsCode()).thenReturn(hsCode);
        when(f.getFtaName()).thenReturn(ftaName);
        when(f.getPartnerCountry()).thenReturn(country);
        when(f.getPreferentialRate()).thenReturn(prefRate);
        when(f.getFormType()).thenReturn(formType);
        when(f.getEffectiveFrom()).thenReturn(LocalDate.of(2024, 1, 1));
        when(f.getConditions()).thenReturn("ROO compliance");
        when(f.getSourceUrl()).thenReturn("https://example.com");
        return f;
    }

    private LpiControlEntity buildLpiControl(String hsCode, String controlType,
                                              String agencyCode) {
        LpiControlEntity l = mock(LpiControlEntity.class);
        when(l.getHsCode()).thenReturn(hsCode);
        when(l.getControlType()).thenReturn(controlType);
        when(l.getAgencyCode()).thenReturn(agencyCode);
        when(l.getAgencyNameTh()).thenReturn("สำนักงาน");
        when(l.getAgencyNameEn()).thenReturn("Agency");
        when(l.getRequirementTh()).thenReturn("ต้องมีใบอนุญาต");
        when(l.getRequirementEn()).thenReturn("License required");
        when(l.getAppliesTo()).thenReturn("IMPORT");
        when(l.getSourceUrl()).thenReturn("https://example.com/lpi");
        return l;
    }

    private AdDutyEntity buildAdDuty(String hsCode, String country, BigDecimal rate) {
        AdDutyEntity d = mock(AdDutyEntity.class);
        when(d.getHsCode()).thenReturn(hsCode);
        when(d.getProductNameTh()).thenReturn("สินค้าทดสอบ");
        when(d.getOriginCountry()).thenReturn(country);
        when(d.getDutyType()).thenReturn("AD");
        when(d.getAdditionalRate()).thenReturn(rate);
        when(d.getEffectiveFrom()).thenReturn(LocalDate.of(2024, 1, 1));
        when(d.getAnnouncementNumber()).thenReturn("AD-2024-001");
        when(d.getSourceUrl()).thenReturn("https://example.com/ad");
        return d;
    }

    private BoiPrivilegeEntity buildBoiPrivilege(String activityCode) {
        BoiPrivilegeEntity b = mock(BoiPrivilegeEntity.class);
        when(b.getActivityCode()).thenReturn(activityCode);
        when(b.getActivityNameTh()).thenReturn("กิจกรรม BOI");
        when(b.getPrivilegeType()).thenReturn("DUTY_EXEMPT");
        when(b.getSectionRef()).thenReturn("มาตรา 36(1)");
        when(b.getDutyReduction()).thenReturn(new BigDecimal("100.00"));
        when(b.getConditions()).thenReturn("BOI approved project");
        when(b.getSourceUrl()).thenReturn("https://example.com/boi");
        return b;
    }

    private ExciseRateEntity buildExciseRate(String hsCode) {
        ExciseRateEntity e = mock(ExciseRateEntity.class);
        when(e.getHsCode()).thenReturn(hsCode);
        when(e.getProductCategory()).thenReturn("Alcoholic beverages");
        when(e.getExciseRate()).thenReturn(new BigDecimal("48.00"));
        when(e.getExciseRateSpecific()).thenReturn("255 บาท/ลิตร");
        when(e.getCalculationMethod()).thenReturn("HIGHER_OF");
        when(e.getSourceUrl()).thenReturn("https://example.com/excise");
        return e;
    }

    // ===== TC-CG-070: lookupSingleCode — พบ HS code =====

    @Nested
    @DisplayName("TC-CG-070: lookupSingleCode — full lookup with all supplementary data")
    class LookupSingleCode {

        @Test
        @DisplayName("TC-CG-070a: พบ HS code พร้อม FTA alert ที่ rate ต่ำกว่า base — แสดง saving")
        void lookup_withFtaSaving() {
            // Given
            HsCodeEntity hs = buildHsEntity("0306.17", "กุ้งแช่แข็ง", "Frozen shrimps",
                    new BigDecimal("30.00"));
            when(hsCodeRepo.findById("0306.17")).thenReturn(Optional.of(hs));

            FtaRateEntity fta = buildFtaRate("0306.17", "ACFTA", "CN",
                    new BigDecimal("5.00"), "Form E");
            when(ftaRateRepo.findActiveByHsCodeAndCountry("0306.17", "CN"))
                    .thenReturn(List.of(fta));

            when(lpiControlRepo.findByHsCodePrefix("030617")).thenReturn(Collections.emptyList());
            when(adDutyRepo.findActiveByHsCodePrefix("030617")).thenReturn(Collections.emptyList());
            when(boiPrivilegeRepo.findByHsCodePrefix("030617")).thenReturn(Collections.emptyList());
            when(exciseRateRepo.findByHsCodePrefix("030617")).thenReturn(Collections.emptyList());

            // When
            HsLookupResponse result = hsLookupService.lookupSingleCode("0306.17", "CN");

            // Then
            assertThat(result.found()).isTrue();
            assertThat(result.code()).isEqualTo("0306.17");
            assertThat(result.baseRate()).isEqualByComparingTo(new BigDecimal("30.00"));
            assertThat(result.ftaAlerts()).hasSize(1);
            assertThat(result.ftaAlerts().get(0).ftaName()).isEqualTo("ACFTA");
            assertThat(result.ftaAlerts().get(0).savingPercent())
                    .isEqualByComparingTo(new BigDecimal("25.00"));
        }

        @Test
        @DisplayName("TC-CG-070b: FTA rate >= base rate — ไม่แสดง FTA alert (ไม่มี saving)")
        void lookup_ftaRateNotLowerThanBase() {
            // Given
            HsCodeEntity hs = buildHsEntity("4001.22", "ยางแผ่น", "Rubber",
                    new BigDecimal("0.00"));
            when(hsCodeRepo.findById("4001.22")).thenReturn(Optional.of(hs));

            FtaRateEntity fta = buildFtaRate("4001.22", "ATIGA", "VN",
                    new BigDecimal("0.00"), "Form D");
            when(ftaRateRepo.findActiveByHsCodeAndCountry("4001.22", "VN"))
                    .thenReturn(List.of(fta));

            when(lpiControlRepo.findByHsCodePrefix("400122")).thenReturn(Collections.emptyList());
            when(adDutyRepo.findActiveByHsCodePrefix("400122")).thenReturn(Collections.emptyList());
            when(boiPrivilegeRepo.findByHsCodePrefix("400122")).thenReturn(Collections.emptyList());
            when(exciseRateRepo.findByHsCodePrefix("400122")).thenReturn(Collections.emptyList());

            // When
            HsLookupResponse result = hsLookupService.lookupSingleCode("4001.22", "VN");

            // Then
            assertThat(result.found()).isTrue();
            assertThat(result.ftaAlerts()).isEmpty();
        }

        @Test
        @DisplayName("TC-CG-070c: ไม่ส่ง originCountry — ค้นหา FTA ทั้งหมด")
        void lookup_noOriginCountry() {
            // Given
            HsCodeEntity hs = buildHsEntity("1006.30", "ข้าว", "Rice",
                    new BigDecimal("30.00"));
            when(hsCodeRepo.findById("1006.30")).thenReturn(Optional.of(hs));
            when(ftaRateRepo.findActiveByHsCode("1006.30")).thenReturn(Collections.emptyList());
            when(lpiControlRepo.findByHsCodePrefix("100630")).thenReturn(Collections.emptyList());
            when(adDutyRepo.findActiveByHsCodePrefix("100630")).thenReturn(Collections.emptyList());
            when(boiPrivilegeRepo.findByHsCodePrefix("100630")).thenReturn(Collections.emptyList());
            when(exciseRateRepo.findByHsCodePrefix("100630")).thenReturn(Collections.emptyList());

            // When
            HsLookupResponse result = hsLookupService.lookupSingleCode("1006.30", null);

            // Then
            assertThat(result.found()).isTrue();
            verify(ftaRateRepo).findActiveByHsCode("1006.30");
            verify(ftaRateRepo, never()).findActiveByHsCodeAndCountry(anyString(), anyString());
        }
    }

    // ===== TC-CG-071: lookupSingleCode — ไม่พบ HS code =====

    @Nested
    @DisplayName("TC-CG-071: lookupSingleCode — code not found")
    class LookupNotFound {

        @Test
        @DisplayName("TC-CG-071a: HS code ไม่อยู่ใน DB — ส่งคืน notFound response")
        void lookup_codeNotFound() {
            // Given
            when(hsCodeRepo.findById("9999.99")).thenReturn(Optional.empty());

            // When
            HsLookupResponse result = hsLookupService.lookupSingleCode("9999.99", "CN");

            // Then
            assertThat(result.found()).isFalse();
            assertThat(result.code()).isEqualTo("9999.99");
            assertThat(result.descriptionTh()).isNull();
            assertThat(result.descriptionEn()).isNull();
            assertThat(result.baseRate()).isNull();
            assertThat(result.ftaAlerts()).isEmpty();
            assertThat(result.lpiAlerts()).isEmpty();
            assertThat(result.adDuties()).isEmpty();
            assertThat(result.boiPrivileges()).isEmpty();
            assertThat(result.exciseRates()).isEmpty();
        }
    }

    // ===== TC-CG-072: lookupSingleCode — LPI, AD, BOI, Excise =====

    @Nested
    @DisplayName("TC-CG-072: lookupSingleCode — supplementary data (LPI/AD/BOI/Excise)")
    class SupplementaryData {

        @Test
        @DisplayName("TC-CG-072a: มี LPI control — แสดง alert")
        void lookup_withLpiControl() {
            // Given
            HsCodeEntity hs = buildHsEntity("0306.17", "กุ้ง", "Shrimp",
                    new BigDecimal("5.00"));
            when(hsCodeRepo.findById("0306.17")).thenReturn(Optional.of(hs));
            when(ftaRateRepo.findActiveByHsCode("0306.17")).thenReturn(Collections.emptyList());

            LpiControlEntity lpi = buildLpiControl("030617", "LICENSE", "DOF");
            when(lpiControlRepo.findByHsCodePrefix("030617")).thenReturn(List.of(lpi));

            when(adDutyRepo.findActiveByHsCodePrefix("030617")).thenReturn(Collections.emptyList());
            when(boiPrivilegeRepo.findByHsCodePrefix("030617")).thenReturn(Collections.emptyList());
            when(exciseRateRepo.findByHsCodePrefix("030617")).thenReturn(Collections.emptyList());

            // When
            HsLookupResponse result = hsLookupService.lookupSingleCode("0306.17", null);

            // Then
            assertThat(result.lpiAlerts()).hasSize(1);
            assertThat(result.lpiAlerts().get(0).controlType()).isEqualTo("LICENSE");
            assertThat(result.lpiAlerts().get(0).agencyCode()).isEqualTo("DOF");
        }

        @Test
        @DisplayName("TC-CG-072b: มี AD duty — แสดง anti-dumping duty")
        void lookup_withAdDuty() {
            // Given
            HsCodeEntity hs = buildHsEntity("7601.10", "อะลูมิเนียม", "Aluminium",
                    new BigDecimal("1.00"));
            when(hsCodeRepo.findById("7601.10")).thenReturn(Optional.of(hs));
            when(ftaRateRepo.findActiveByHsCode("7601.10")).thenReturn(Collections.emptyList());
            when(lpiControlRepo.findByHsCodePrefix("760110")).thenReturn(Collections.emptyList());

            AdDutyEntity ad = buildAdDuty("760110", "CN", new BigDecimal("15.00"));
            when(adDutyRepo.findActiveByHsCodePrefix("760110")).thenReturn(List.of(ad));

            when(boiPrivilegeRepo.findByHsCodePrefix("760110")).thenReturn(Collections.emptyList());
            when(exciseRateRepo.findByHsCodePrefix("760110")).thenReturn(Collections.emptyList());

            // When
            HsLookupResponse result = hsLookupService.lookupSingleCode("7601.10", null);

            // Then
            assertThat(result.adDuties()).hasSize(1);
            assertThat(result.adDuties().get(0).additionalRate())
                    .isEqualByComparingTo(new BigDecimal("15.00"));
            assertThat(result.adDuties().get(0).dutyType()).isEqualTo("AD");
        }

        @Test
        @DisplayName("TC-CG-072c: มี BOI privilege — แสดง privilege")
        void lookup_withBoiPrivilege() {
            // Given
            HsCodeEntity hs = buildHsEntity("8471.30", "คอมพิวเตอร์", "Computer",
                    new BigDecimal("0.00"));
            when(hsCodeRepo.findById("8471.30")).thenReturn(Optional.of(hs));
            when(ftaRateRepo.findActiveByHsCode("8471.30")).thenReturn(Collections.emptyList());
            when(lpiControlRepo.findByHsCodePrefix("847130")).thenReturn(Collections.emptyList());
            when(adDutyRepo.findActiveByHsCodePrefix("847130")).thenReturn(Collections.emptyList());

            BoiPrivilegeEntity boi = buildBoiPrivilege("5.1");
            when(boiPrivilegeRepo.findByHsCodePrefix("847130")).thenReturn(List.of(boi));

            when(exciseRateRepo.findByHsCodePrefix("847130")).thenReturn(Collections.emptyList());

            // When
            HsLookupResponse result = hsLookupService.lookupSingleCode("8471.30", null);

            // Then
            assertThat(result.boiPrivileges()).hasSize(1);
            assertThat(result.boiPrivileges().get(0).privilegeType()).isEqualTo("DUTY_EXEMPT");
            assertThat(result.boiPrivileges().get(0).dutyReduction())
                    .isEqualByComparingTo(new BigDecimal("100.00"));
        }

        @Test
        @DisplayName("TC-CG-072d: มี Excise rate — แสดง excise")
        void lookup_withExciseRate() {
            // Given
            HsCodeEntity hs = buildHsEntity("2208.30", "วิสกี้", "Whisky",
                    new BigDecimal("60.00"));
            when(hsCodeRepo.findById("2208.30")).thenReturn(Optional.of(hs));
            when(ftaRateRepo.findActiveByHsCode("2208.30")).thenReturn(Collections.emptyList());
            when(lpiControlRepo.findByHsCodePrefix("220830")).thenReturn(Collections.emptyList());
            when(adDutyRepo.findActiveByHsCodePrefix("220830")).thenReturn(Collections.emptyList());
            when(boiPrivilegeRepo.findByHsCodePrefix("220830")).thenReturn(Collections.emptyList());

            ExciseRateEntity excise = buildExciseRate("220830");
            when(exciseRateRepo.findByHsCodePrefix("220830")).thenReturn(List.of(excise));

            // When
            HsLookupResponse result = hsLookupService.lookupSingleCode("2208.30", null);

            // Then
            assertThat(result.exciseRates()).hasSize(1);
            assertThat(result.exciseRates().get(0).exciseRate())
                    .isEqualByComparingTo(new BigDecimal("48.00"));
            assertThat(result.exciseRates().get(0).calculationMethod()).isEqualTo("HIGHER_OF");
        }
    }

    // ===== TC-CG-073: batchLookup =====

    @Nested
    @DisplayName("TC-CG-073: batchLookup — หลาย codes พร้อมกัน")
    class BatchLookup {

        @Test
        @DisplayName("TC-CG-073a: batch 2 codes, 1 found + 1 not found")
        void batchLookup_mixedResults() {
            // Given
            HsCodeEntity hs = buildHsEntity("1006.30", "ข้าว", "Rice",
                    new BigDecimal("30.00"));
            when(hsCodeRepo.findById("1006.30")).thenReturn(Optional.of(hs));
            when(hsCodeRepo.findById("9999.99")).thenReturn(Optional.empty());

            when(ftaRateRepo.findActiveByHsCodeAndCountry("1006.30", "CN"))
                    .thenReturn(Collections.emptyList());
            when(lpiControlRepo.findByHsCodePrefix("100630")).thenReturn(Collections.emptyList());
            when(adDutyRepo.findActiveByHsCodePrefix("100630")).thenReturn(Collections.emptyList());
            when(boiPrivilegeRepo.findByHsCodePrefix("100630")).thenReturn(Collections.emptyList());
            when(exciseRateRepo.findByHsCodePrefix("100630")).thenReturn(Collections.emptyList());

            // When
            List<HsLookupResponse> results = hsLookupService.batchLookup(
                    List.of("1006.30", "9999.99"), "CN");

            // Then
            assertThat(results).hasSize(2);
            assertThat(results.get(0).found()).isTrue();
            assertThat(results.get(0).code()).isEqualTo("1006.30");
            assertThat(results.get(1).found()).isFalse();
            assertThat(results.get(1).code()).isEqualTo("9999.99");
        }

        @Test
        @DisplayName("TC-CG-073b: batch empty list — ส่งคืน empty list")
        void batchLookup_emptyCodes() {
            // When
            List<HsLookupResponse> results = hsLookupService.batchLookup(
                    Collections.emptyList(), "CN");

            // Then
            assertThat(results).isEmpty();
        }
    }

    // ===== TC-CG-074: code normalization =====

    @Nested
    @DisplayName("TC-CG-074: code normalization — ลบ dots และ non-digit ออก")
    class CodeNormalization {

        @Test
        @DisplayName("TC-CG-074a: code '0306.17' normalize เป็น '030617' สำหรับ prefix search")
        void lookup_normalizesCodeForPrefixSearch() {
            // Given
            HsCodeEntity hs = buildHsEntity("0306.17", "กุ้ง", "Shrimp",
                    new BigDecimal("5.00"));
            when(hsCodeRepo.findById("0306.17")).thenReturn(Optional.of(hs));
            when(ftaRateRepo.findActiveByHsCode("0306.17")).thenReturn(Collections.emptyList());
            when(lpiControlRepo.findByHsCodePrefix("030617")).thenReturn(Collections.emptyList());
            when(adDutyRepo.findActiveByHsCodePrefix("030617")).thenReturn(Collections.emptyList());
            when(boiPrivilegeRepo.findByHsCodePrefix("030617")).thenReturn(Collections.emptyList());
            when(exciseRateRepo.findByHsCodePrefix("030617")).thenReturn(Collections.emptyList());

            // When
            hsLookupService.lookupSingleCode("0306.17", null);

            // Then — verify prefix-based repos called with normalized code (no dots)
            verify(lpiControlRepo).findByHsCodePrefix("030617");
            verify(adDutyRepo).findActiveByHsCodePrefix("030617");
            verify(boiPrivilegeRepo).findByHsCodePrefix("030617");
            verify(exciseRateRepo).findByHsCodePrefix("030617");
        }
    }

    // ===== TC-CG-075: null baseRate handling =====

    @Nested
    @DisplayName("TC-CG-075: null baseRate — ใช้ BigDecimal.ZERO แทน")
    class NullBaseRate {

        @Test
        @DisplayName("TC-CG-075a: HS code มี baseRate = null — FTA comparison ใช้ ZERO")
        void lookup_nullBaseRate_usesZero() {
            // Given
            HsCodeEntity hs = buildHsEntity("9999.00", "ทดสอบ", "Test", null);
            when(hsCodeRepo.findById("9999.00")).thenReturn(Optional.of(hs));

            // FTA rate = 0 which is NOT less than ZERO -> no alert
            FtaRateEntity fta = buildFtaRate("9999.00", "TEST-FTA", "JP",
                    BigDecimal.ZERO, "Form X");
            when(ftaRateRepo.findActiveByHsCode("9999.00")).thenReturn(List.of(fta));

            when(lpiControlRepo.findByHsCodePrefix("999900")).thenReturn(Collections.emptyList());
            when(adDutyRepo.findActiveByHsCodePrefix("999900")).thenReturn(Collections.emptyList());
            when(boiPrivilegeRepo.findByHsCodePrefix("999900")).thenReturn(Collections.emptyList());
            when(exciseRateRepo.findByHsCodePrefix("999900")).thenReturn(Collections.emptyList());

            // When
            HsLookupResponse result = hsLookupService.lookupSingleCode("9999.00", null);

            // Then
            assertThat(result.found()).isTrue();
            assertThat(result.ftaAlerts()).isEmpty(); // 0 is not < 0
        }
    }
}
