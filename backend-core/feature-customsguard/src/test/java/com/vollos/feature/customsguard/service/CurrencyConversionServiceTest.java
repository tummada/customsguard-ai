package com.vollos.feature.customsguard.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

/**
 * Unit tests for CurrencyConversionService (C1 — Audit v8).
 */
@ExtendWith(MockitoExtension.class)
class CurrencyConversionServiceTest {

    @Mock
    private ExchangeRateService exchangeRateService;

    @InjectMocks
    private CurrencyConversionService conversionService;

    @Nested
    @DisplayName("C1-001: convertToThb — สกุลเงิน THB ไม่ต้องแปลง")
    class ThbCurrency {

        @Test
        @DisplayName("C1-001a: currency=THB → คืนค่าเดิม ไม่แปลง")
        void thb_returnsUnchanged() {
            var result = conversionService.convertToThb(new BigDecimal("1000"), "THB", "IMPORT");
            assertThat(result.amountThb()).isEqualByComparingTo("1000");
            assertThat(result.converted()).isFalse();
            assertThat(result.hasWarning()).isFalse();
        }

        @Test
        @DisplayName("C1-001b: currency=BAHT → คืนค่าเดิม ไม่แปลง")
        void baht_returnsUnchanged() {
            var result = conversionService.convertToThb(new BigDecimal("500"), "BAHT", "IMPORT");
            assertThat(result.amountThb()).isEqualByComparingTo("500");
            assertThat(result.converted()).isFalse();
        }

        @Test
        @DisplayName("C1-001c: currency=null → สมมุติเป็น THB ไม่แปลง")
        void nullCurrency_treatedAsThb() {
            var result = conversionService.convertToThb(new BigDecimal("1000"), null, "IMPORT");
            assertThat(result.amountThb()).isEqualByComparingTo("1000");
            assertThat(result.converted()).isFalse();
        }

        @Test
        @DisplayName("C1-001d: currency=blank → สมมุติเป็น THB ไม่แปลง")
        void blankCurrency_treatedAsThb() {
            var result = conversionService.convertToThb(new BigDecimal("1000"), "  ", "IMPORT");
            assertThat(result.amountThb()).isEqualByComparingTo("1000");
            assertThat(result.converted()).isFalse();
        }
    }

    @Nested
    @DisplayName("C1-002: convertToThb — แปลงสกุลเงินต่างประเทศ")
    class ForeignCurrency {

        @Test
        @DisplayName("C1-002a: USD 1000 × 34.50 = 34500 THB (IMPORT → midRate)")
        void usd_import_convertsWithMidRate() {
            when(exchangeRateService.getRateForDeclaration("USD", "IMPORT"))
                    .thenReturn(Optional.of(new BigDecimal("34.5000")));

            var result = conversionService.convertToThb(new BigDecimal("1000"), "USD", "IMPORT");
            assertThat(result.amountThb()).isEqualByComparingTo("34500.00");
            assertThat(result.converted()).isTrue();
            assertThat(result.exchangeRate()).isEqualByComparingTo("34.5000");
            assertThat(result.originalCurrency()).isEqualTo("USD");
            assertThat(result.hasWarning()).isFalse();
        }

        @Test
        @DisplayName("C1-002b: EUR 500 × 37.25 = 18625 THB (EXPORT → exportRate)")
        void eur_export_convertsWithExportRate() {
            when(exchangeRateService.getRateForDeclaration("EUR", "EXPORT"))
                    .thenReturn(Optional.of(new BigDecimal("37.2500")));

            var result = conversionService.convertToThb(new BigDecimal("500"), "eur", "EXPORT");
            assertThat(result.amountThb()).isEqualByComparingTo("18625.00");
            assertThat(result.converted()).isTrue();
        }

        @Test
        @DisplayName("C1-002c: lowercase 'usd' → uppercase ก่อนค้นหา")
        void lowercaseCurrency_uppercased() {
            when(exchangeRateService.getRateForDeclaration("USD", "IMPORT"))
                    .thenReturn(Optional.of(new BigDecimal("34.5000")));

            var result = conversionService.convertToThb(new BigDecimal("100"), "usd", "IMPORT");
            assertThat(result.converted()).isTrue();
        }
    }

    @Nested
    @DisplayName("C1-003: convertToThb — ไม่พบอัตราแลกเปลี่ยน")
    class RateNotFound {

        @Test
        @DisplayName("C1-003a: สกุลเงินที่ไม่มีใน DB → warning flag")
        void unknownCurrency_returnsWarning() {
            when(exchangeRateService.getRateForDeclaration("XYZ", "IMPORT"))
                    .thenReturn(Optional.empty());

            var result = conversionService.convertToThb(new BigDecimal("1000"), "XYZ", "IMPORT");
            assertThat(result.hasWarning()).isTrue();
            assertThat(result.warning()).contains("XYZ");
            assertThat(result.warning()).contains("ไม่พบอัตราแลกเปลี่ยน");
            assertThat(result.converted()).isFalse();
            // ใช้ค่าเดิม (ไม่ crash)
            assertThat(result.amountThb()).isEqualByComparingTo("1000");
        }
    }

    @Nested
    @DisplayName("C1-004: convertToThb — edge cases")
    class EdgeCases {

        @Test
        @DisplayName("C1-004a: amount=null → warning, no crash")
        void nullAmount_returnsError() {
            var result = conversionService.convertToThb(null, "USD", "IMPORT");
            assertThat(result.hasWarning()).isTrue();
            assertThat(result.amountThb()).isEqualByComparingTo("0");
        }

        @Test
        @DisplayName("C1-004b: amount=0 → แปลงได้ คืน 0")
        void zeroAmount_returnsZero() {
            when(exchangeRateService.getRateForDeclaration("USD", "IMPORT"))
                    .thenReturn(Optional.of(new BigDecimal("34.5000")));

            var result = conversionService.convertToThb(BigDecimal.ZERO, "USD", "IMPORT");
            assertThat(result.amountThb()).isEqualByComparingTo("0.00");
            assertThat(result.converted()).isTrue();
        }
    }
}
