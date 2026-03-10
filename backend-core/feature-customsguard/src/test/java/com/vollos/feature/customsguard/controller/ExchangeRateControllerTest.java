package com.vollos.feature.customsguard.controller;

import com.vollos.feature.customsguard.dto.ExchangeRateDto;
import com.vollos.feature.customsguard.service.ExchangeRateService;
import com.vollos.feature.customsguard.service.ExchangeRateSyncService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Controller tests for ExchangeRateController.
 * TC-CG-090 to TC-CG-095
 */
@WebMvcTest(ExchangeRateController.class)
@Import(ExchangeRateControllerTest.TestSecurityConfig.class)
@TestPropertySource(properties = "admin.secret=test-secret")
class ExchangeRateControllerTest {

    @TestConfiguration
    static class TestSecurityConfig {
        @Bean
        public SecurityFilterChain testFilterChain(HttpSecurity http) throws Exception {
            http.csrf(csrf -> csrf.disable())
                    .authorizeHttpRequests(auth -> auth.anyRequest().permitAll());
            return http.build();
        }
    }

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ExchangeRateService exchangeRateService;

    @MockitoBean
    private ExchangeRateSyncService exchangeRateSyncService;

    private ExchangeRateDto buildUsdRate() {
        return new ExchangeRateDto("USD", "US Dollar",
                new BigDecimal("34.5000"), LocalDate.of(2026, 3, 9), "BOT");
    }

    private ExchangeRateDto buildEurRate() {
        return new ExchangeRateDto("EUR", "Euro",
                new BigDecimal("37.2500"), LocalDate.of(2026, 3, 9), "BOT");
    }

    // ===== TC-CG-090: GET /v1/customsguard/exchange-rates =====

    @Nested
    @DisplayName("TC-CG-090: GET /exchange-rates — ดึงอัตราแลกเปลี่ยนล่าสุดทั้งหมด")
    class GetAllRates {

        @Test
        @DisplayName("TC-CG-090a: มีข้อมูล — ส่งคืน 200 + list ของ rates")
        void getAll_ok() throws Exception {
            // Given
            when(exchangeRateService.getLatestRates())
                    .thenReturn(List.of(buildUsdRate(), buildEurRate()));

            // When & Then
            mockMvc.perform(get("/v1/customsguard/exchange-rates"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(2)))
                    .andExpect(jsonPath("$[0].currencyCode").value("USD"))
                    .andExpect(jsonPath("$[0].currencyName").value("US Dollar"))
                    .andExpect(jsonPath("$[0].midRate").value(34.5))
                    .andExpect(jsonPath("$[0].source").value("BOT"))
                    .andExpect(jsonPath("$[1].currencyCode").value("EUR"));
        }

        @Test
        @DisplayName("TC-CG-090b: ไม่มีข้อมูล — ส่งคืน 200 + empty list")
        void getAll_empty() throws Exception {
            // Given
            when(exchangeRateService.getLatestRates())
                    .thenReturn(Collections.emptyList());

            // When & Then
            mockMvc.perform(get("/v1/customsguard/exchange-rates"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(0)));
        }
    }

    // ===== TC-CG-095: GET /v1/customsguard/exchange-rates/{currency} =====

    @Nested
    @DisplayName("TC-CG-095: GET /exchange-rates/{currency} — ดึง rate ตามสกุลเงิน")
    class GetByCurrency {

        @Test
        @DisplayName("TC-CG-095a: พบสกุลเงิน — ส่งคืน 200 + rate")
        void getByCurrency_found() throws Exception {
            // Given
            when(exchangeRateService.getLatestByCurrency("USD"))
                    .thenReturn(Optional.of(buildUsdRate()));

            // When & Then
            mockMvc.perform(get("/v1/customsguard/exchange-rates/USD"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.currencyCode").value("USD"))
                    .andExpect(jsonPath("$.midRate").value(34.5))
                    .andExpect(jsonPath("$.effectiveDate").value("2026-03-09"))
                    .andExpect(jsonPath("$.source").value("BOT"));
        }

        @Test
        @DisplayName("TC-CG-095b: ไม่พบสกุลเงิน — ส่งคืน 404")
        void getByCurrency_notFound() throws Exception {
            // Given
            when(exchangeRateService.getLatestByCurrency("XYZ"))
                    .thenReturn(Optional.empty());

            // When & Then
            mockMvc.perform(get("/v1/customsguard/exchange-rates/XYZ"))
                    .andExpect(status().isNotFound());
        }

        @Test
        @DisplayName("TC-CG-095c: lowercase currency — service รับค่าตาม path ตรงๆ")
        void getByCurrency_lowercase() throws Exception {
            // Given
            when(exchangeRateService.getLatestByCurrency("usd"))
                    .thenReturn(Optional.of(buildUsdRate()));

            // When & Then
            mockMvc.perform(get("/v1/customsguard/exchange-rates/usd"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.currencyCode").value("USD"));
        }
    }
}
