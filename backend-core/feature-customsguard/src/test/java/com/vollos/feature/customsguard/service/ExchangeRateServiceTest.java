package com.vollos.feature.customsguard.service;

import com.vollos.feature.customsguard.dto.ExchangeRateDto;
import com.vollos.feature.customsguard.entity.ExchangeRateEntity;
import com.vollos.feature.customsguard.repository.ExchangeRateRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
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
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Unit tests for ExchangeRateService.
 * TC-CG-097 to TC-CG-102
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ExchangeRateServiceTest {

    @Mock
    private ExchangeRateRepository exchangeRateRepo;

    @InjectMocks
    private ExchangeRateService exchangeRateService;

    // --- helpers: ExchangeRateEntity has protected constructor, use Mockito stub ---

    private ExchangeRateEntity buildEntity(String code, String name,
                                            BigDecimal rate, LocalDate date) {
        return buildEntity(code, name, rate, rate, date);
    }

    private ExchangeRateEntity buildEntity(String code, String name,
                                            BigDecimal midRate, BigDecimal exportRate, LocalDate date) {
        ExchangeRateEntity e = mock(ExchangeRateEntity.class);
        when(e.getCurrencyCode()).thenReturn(code);
        when(e.getCurrencyName()).thenReturn(name);
        when(e.getMidRate()).thenReturn(midRate);
        when(e.getExportRate()).thenReturn(exportRate);
        when(e.getEffectiveDate()).thenReturn(date);
        when(e.getSource()).thenReturn("BOT");
        return e;
    }

    // ===== TC-CG-097: getLatestRates =====

    @Nested
    @DisplayName("TC-CG-097: getLatestRates — ดึง rates ล่าสุดทั้งหมด")
    class GetLatestRates {

        @Test
        @DisplayName("TC-CG-097a: มี 2 currencies — map เป็น DTO ถูกต้อง")
        void getLatestRates_returnsAll() {
            // Given
            ExchangeRateEntity usd = buildEntity("USD", "US Dollar",
                    new BigDecimal("34.5000"), LocalDate.of(2026, 3, 9));
            ExchangeRateEntity eur = buildEntity("EUR", "Euro",
                    new BigDecimal("37.2500"), LocalDate.of(2026, 3, 9));
            when(exchangeRateRepo.findLatestRates()).thenReturn(List.of(usd, eur));

            // When
            List<ExchangeRateDto> result = exchangeRateService.getLatestRates();

            // Then
            assertThat(result).hasSize(2);
            assertThat(result.get(0).currencyCode()).isEqualTo("USD");
            assertThat(result.get(0).midRate()).isEqualByComparingTo(new BigDecimal("34.5000"));
            assertThat(result.get(0).source()).isEqualTo("BOT");
            assertThat(result.get(1).currencyCode()).isEqualTo("EUR");
        }

        @Test
        @DisplayName("TC-CG-097b: ไม่มีข้อมูล — ส่งคืน empty list")
        void getLatestRates_empty() {
            // Given
            when(exchangeRateRepo.findLatestRates()).thenReturn(Collections.emptyList());

            // When
            List<ExchangeRateDto> result = exchangeRateService.getLatestRates();

            // Then
            assertThat(result).isEmpty();
        }
    }

    // ===== TC-CG-100: getLatestByCurrency =====

    @Nested
    @DisplayName("TC-CG-100: getLatestByCurrency — ดึง rate ตามสกุลเงิน")
    class GetLatestByCurrency {

        @Test
        @DisplayName("TC-CG-100a: พบ currency — ส่งคืน Optional.of(dto)")
        void getByCurrency_found() {
            // Given
            ExchangeRateEntity usd = buildEntity("USD", "US Dollar",
                    new BigDecimal("34.5000"), LocalDate.of(2026, 3, 9));
            when(exchangeRateRepo.findLatestByCurrency("USD"))
                    .thenReturn(Optional.of(usd));

            // When
            Optional<ExchangeRateDto> result = exchangeRateService.getLatestByCurrency("usd");

            // Then
            assertThat(result).isPresent();
            assertThat(result.get().currencyCode()).isEqualTo("USD");
            assertThat(result.get().currencyName()).isEqualTo("US Dollar");
            assertThat(result.get().effectiveDate()).isEqualTo(LocalDate.of(2026, 3, 9));
        }

        @Test
        @DisplayName("TC-CG-100b: ไม่พบ currency — ส่งคืน Optional.empty()")
        void getByCurrency_notFound() {
            // Given
            when(exchangeRateRepo.findLatestByCurrency("XYZ"))
                    .thenReturn(Optional.empty());

            // When
            Optional<ExchangeRateDto> result = exchangeRateService.getLatestByCurrency("xyz");

            // Then
            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("TC-CG-102: lowercase input ถูก uppercase ก่อน query — ตรวจว่า toUpperCase() ทำงาน")
        void getByCurrency_uppercaseConversion() {
            // Given — build mock entity BEFORE passing to when() to avoid UnfinishedStubbingException
            ExchangeRateEntity jpy = buildEntity("JPY", "Japanese Yen",
                    new BigDecimal("0.2300"), LocalDate.of(2026, 3, 9));
            when(exchangeRateRepo.findLatestByCurrency("JPY"))
                    .thenReturn(Optional.of(jpy));

            // When
            Optional<ExchangeRateDto> result = exchangeRateService.getLatestByCurrency("jpy");

            // Then
            assertThat(result).isPresent();
            assertThat(result.get().currencyCode()).isEqualTo("JPY");
        }
    }

    // ===== C2: getRateForDeclaration — เลือก rate ตาม declarationType =====

    @Nested
    @DisplayName("C2: getRateForDeclaration — เลือก rate ตาม declarationType")
    class GetRateForDeclaration {

        @Test
        @DisplayName("C2-001: IMPORT → ใช้ midRate")
        void import_usesMidRate() {
            ExchangeRateEntity usd = buildEntity("USD", "US Dollar",
                    new BigDecimal("34.5000"), new BigDecimal("34.2000"), LocalDate.of(2026, 3, 9));
            when(exchangeRateRepo.findLatestByCurrency("USD")).thenReturn(Optional.of(usd));

            Optional<java.math.BigDecimal> result = exchangeRateService.getRateForDeclaration("USD", "IMPORT");

            assertThat(result).isPresent();
            assertThat(result.get()).isEqualByComparingTo("34.5000");
        }

        @Test
        @DisplayName("C2-002: EXPORT → ใช้ exportRate")
        void export_usesExportRate() {
            ExchangeRateEntity usd = buildEntity("USD", "US Dollar",
                    new BigDecimal("34.5000"), new BigDecimal("34.2000"), LocalDate.of(2026, 3, 9));
            when(exchangeRateRepo.findLatestByCurrency("USD")).thenReturn(Optional.of(usd));

            Optional<java.math.BigDecimal> result = exchangeRateService.getRateForDeclaration("USD", "EXPORT");

            assertThat(result).isPresent();
            assertThat(result.get()).isEqualByComparingTo("34.2000");
        }

        @Test
        @DisplayName("C2-003: EXPORT + exportRate=null → fallback midRate")
        void export_nullExportRate_fallbackMidRate() {
            ExchangeRateEntity usd = buildEntity("USD", "US Dollar",
                    new BigDecimal("34.5000"), null, LocalDate.of(2026, 3, 9));
            when(exchangeRateRepo.findLatestByCurrency("USD")).thenReturn(Optional.of(usd));

            Optional<java.math.BigDecimal> result = exchangeRateService.getRateForDeclaration("USD", "EXPORT");

            assertThat(result).isPresent();
            assertThat(result.get()).isEqualByComparingTo("34.5000"); // fallback to midRate
        }

        @Test
        @DisplayName("C2-004: TRANSIT → ใช้ midRate")
        void transit_usesMidRate() {
            ExchangeRateEntity eur = buildEntity("EUR", "Euro",
                    new BigDecimal("37.2500"), new BigDecimal("37.0000"), LocalDate.of(2026, 3, 9));
            when(exchangeRateRepo.findLatestByCurrency("EUR")).thenReturn(Optional.of(eur));

            Optional<java.math.BigDecimal> result = exchangeRateService.getRateForDeclaration("EUR", "TRANSIT");

            assertThat(result).isPresent();
            assertThat(result.get()).isEqualByComparingTo("37.2500");
        }

        @Test
        @DisplayName("C2-005: ไม่พบ currency → empty")
        void unknownCurrency_empty() {
            when(exchangeRateRepo.findLatestByCurrency("XYZ")).thenReturn(Optional.empty());

            Optional<java.math.BigDecimal> result = exchangeRateService.getRateForDeclaration("XYZ", "IMPORT");

            assertThat(result).isEmpty();
        }
    }
}
