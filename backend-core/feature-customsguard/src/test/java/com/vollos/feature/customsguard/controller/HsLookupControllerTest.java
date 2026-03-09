package com.vollos.feature.customsguard.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vollos.feature.customsguard.dto.HsLookupResponse;
import com.vollos.feature.customsguard.service.HsLookupService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Controller tests for HsLookupController.
 * TC-CG-080 to TC-CG-083
 */
@WebMvcTest(HsLookupController.class)
@Import(HsLookupControllerTest.TestSecurityConfig.class)
class HsLookupControllerTest {

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

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private HsLookupService hsLookupService;

    // ===== TC-CG-080: POST /v1/customsguard/hs/lookup =====

    @Nested
    @DisplayName("TC-CG-080: POST /hs/lookup — batch lookup endpoint")
    class PostLookup {

        @Test
        @DisplayName("TC-CG-080a: lookup 1 code สำเร็จ — ส่งคืน 200 + result")
        void lookup_singleCode_ok() throws Exception {
            // Given
            HsLookupResponse resp = new HsLookupResponse(
                    "0306.17", "กุ้งแช่แข็ง", "Frozen shrimps",
                    new BigDecimal("5.00"), "KG",
                    List.of(), List.of(), List.of(), List.of(), List.of(), true);
            when(hsLookupService.batchLookup(List.of("0306.17"), "CN"))
                    .thenReturn(List.of(resp));

            String body = """
                    {"codes": ["0306.17"], "originCountry": "CN"}
                    """;

            // When & Then
            mockMvc.perform(post("/v1/customsguard/hs/lookup")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(1)))
                    .andExpect(jsonPath("$[0].code").value("0306.17"))
                    .andExpect(jsonPath("$[0].found").value(true))
                    .andExpect(jsonPath("$[0].descriptionTh").value("กุ้งแช่แข็ง"));
        }

        @Test
        @DisplayName("TC-CG-080b: lookup หลาย codes — ส่งคืน 200 + multiple results")
        void lookup_multipleCodes_ok() throws Exception {
            // Given
            HsLookupResponse resp1 = new HsLookupResponse(
                    "1006.30", "ข้าวขาว", "Rice",
                    new BigDecimal("30.00"), "KG",
                    List.of(), List.of(), List.of(), List.of(), List.of(), true);
            HsLookupResponse resp2 = HsLookupResponse.notFound("9999.99");

            when(hsLookupService.batchLookup(List.of("1006.30", "9999.99"), "CN"))
                    .thenReturn(List.of(resp1, resp2));

            String body = """
                    {"codes": ["1006.30", "9999.99"], "originCountry": "CN"}
                    """;

            // When & Then
            mockMvc.perform(post("/v1/customsguard/hs/lookup")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(2)))
                    .andExpect(jsonPath("$[0].found").value(true))
                    .andExpect(jsonPath("$[1].found").value(false));
        }

        @Test
        @DisplayName("TC-CG-081: codes ว่าง — ส่งคืน 400 (validation @NotEmpty)")
        void lookup_emptyCodes_returns400() throws Exception {
            String body = """
                    {"codes": [], "originCountry": "CN"}
                    """;

            mockMvc.perform(post("/v1/customsguard/hs/lookup")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("TC-CG-082: ไม่ส่ง codes field — ส่งคืน 400")
        void lookup_missingCodes_returns400() throws Exception {
            String body = """
                    {"originCountry": "CN"}
                    """;

            mockMvc.perform(post("/v1/customsguard/hs/lookup")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("TC-CG-083: ไม่ส่ง originCountry (null) — ส่งคืน 200 ปกติ")
        void lookup_noOriginCountry_ok() throws Exception {
            // Given
            HsLookupResponse resp = new HsLookupResponse(
                    "1006.30", "ข้าวขาว", "Rice",
                    new BigDecimal("30.00"), "KG",
                    List.of(), List.of(), List.of(), List.of(), List.of(), true);
            when(hsLookupService.batchLookup(List.of("1006.30"), null))
                    .thenReturn(List.of(resp));

            String body = """
                    {"codes": ["1006.30"]}
                    """;

            // When & Then
            mockMvc.perform(post("/v1/customsguard/hs/lookup")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[0].found").value(true));
        }
    }
}
