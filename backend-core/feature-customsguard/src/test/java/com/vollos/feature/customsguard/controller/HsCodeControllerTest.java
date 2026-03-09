package com.vollos.feature.customsguard.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vollos.feature.customsguard.dto.HsCodeResponse;
import com.vollos.feature.customsguard.dto.SemanticSearchRequest;
import com.vollos.feature.customsguard.dto.SemanticSearchResponse;
import com.vollos.feature.customsguard.service.HsCodeService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Controller tests for HsCodeController.
 * TC-CG-064 to TC-CG-067
 */
@WebMvcTest(HsCodeController.class)
@Import(HsCodeControllerTest.TestSecurityConfig.class)
class HsCodeControllerTest {

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
    private HsCodeService hsCodeService;

    // ===== TC-CG-064: GET /v1/customsguard/hs-codes?query= =====

    @Nested
    @DisplayName("TC-CG-064: GET /hs-codes — text search endpoint")
    class GetSearch {

        @Test
        @DisplayName("TC-CG-064a: ค้นหาพบ — ส่งคืน 200 + page content")
        void search_found() throws Exception {
            // Given
            HsCodeResponse resp = new HsCodeResponse("1006.30", "ข้าวขาว",
                    "Semi-milled rice", new BigDecimal("30.00"), "KG", "Cereals",
                    (short) 2, (short) 10);
            Page<HsCodeResponse> page = new PageImpl<>(List.of(resp),
                    PageRequest.of(0, 20), 1);
            when(hsCodeService.search(eq("rice"), any())).thenReturn(page);

            // When & Then
            mockMvc.perform(get("/v1/customsguard/hs-codes")
                            .param("query", "rice")
                            .param("page", "0")
                            .param("size", "20"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(1)))
                    .andExpect(jsonPath("$.content[0].code").value("1006.30"))
                    .andExpect(jsonPath("$.content[0].descriptionTh").value("ข้าวขาว"))
                    .andExpect(jsonPath("$.content[0].descriptionEn").value("Semi-milled rice"))
                    .andExpect(jsonPath("$.content[0].baseRate").value(30.00))
                    .andExpect(jsonPath("$.totalElements").value(1));
        }

        @Test
        @DisplayName("TC-CG-064b: ค้นหาไม่พบ — ส่งคืน 200 + empty content")
        void search_notFound() throws Exception {
            // Given
            when(hsCodeService.search(eq("xyz"), any()))
                    .thenReturn(Page.empty());

            // When & Then
            mockMvc.perform(get("/v1/customsguard/hs-codes")
                            .param("query", "xyz"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content", hasSize(0)))
                    .andExpect(jsonPath("$.totalElements").value(0));
        }

        @Test
        @DisplayName("TC-CG-064c: ไม่ส่ง query param — ส่งคืน 400")
        void search_missingQuery() throws Exception {
            mockMvc.perform(get("/v1/customsguard/hs-codes"))
                    .andExpect(status().isBadRequest());
        }
    }

    // ===== TC-CG-065: POST /v1/customsguard/hs-codes/semantic =====

    @Nested
    @DisplayName("TC-CG-065: POST /hs-codes/semantic — vector search endpoint")
    class PostSemantic {

        @Test
        @DisplayName("TC-CG-065a: semantic search สำเร็จ — ส่งคืน 200 + list")
        void semanticSearch_ok() throws Exception {
            // Given
            SemanticSearchResponse resp = new SemanticSearchResponse(
                    "0306.17", "กุ้งแช่แข็ง", "Frozen shrimps",
                    new BigDecimal("5.00"), "Seafood", "KG", 0.92);
            when(hsCodeService.semanticSearch("shrimp", 5))
                    .thenReturn(List.of(resp));

            String body = objectMapper.writeValueAsString(
                    new SemanticSearchRequest("shrimp", 5));

            // When & Then
            mockMvc.perform(post("/v1/customsguard/hs-codes/semantic")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(1)))
                    .andExpect(jsonPath("$[0].code").value("0306.17"))
                    .andExpect(jsonPath("$[0].similarity").value(0.92));
        }

        @Test
        @DisplayName("TC-CG-065b: query ว่าง — ส่งคืน 400 (validation)")
        void semanticSearch_blankQuery() throws Exception {
            String body = """
                    {"query": "", "limit": 5}
                    """;

            mockMvc.perform(post("/v1/customsguard/hs-codes/semantic")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("TC-CG-065c: default limit ถ้าไม่ส่ง — ใช้ค่า 10")
        void semanticSearch_defaultLimit() throws Exception {
            // Given
            when(hsCodeService.semanticSearch("test", 10))
                    .thenReturn(Collections.emptyList());

            String body = """
                    {"query": "test"}
                    """;

            // When & Then
            mockMvc.perform(post("/v1/customsguard/hs-codes/semantic")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(0)));
        }
    }

    // ===== TC-CG-066: POST /v1/customsguard/hs-codes/seed =====

    @Nested
    @DisplayName("TC-CG-066: POST /hs-codes/seed — seed sample data")
    class PostSeed {

        @Test
        @DisplayName("TC-CG-066a: seed สำเร็จ — ส่งคืน 200 + count")
        void seed_ok() throws Exception {
            when(hsCodeService.seedSampleHsCodes()).thenReturn(20);

            mockMvc.perform(post("/v1/customsguard/hs-codes/seed"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.seeded").value(20));
        }

        @Test
        @DisplayName("TC-CG-066b: seed เมื่อมีข้อมูลแล้ว — ส่งคืน 200 + seeded=0")
        void seed_alreadyExists() throws Exception {
            when(hsCodeService.seedSampleHsCodes()).thenReturn(0);

            mockMvc.perform(post("/v1/customsguard/hs-codes/seed"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.seeded").value(0));
        }
    }

    // ===== TC-CG-067: POST /v1/customsguard/hs-codes/embed-all =====

    @Nested
    @DisplayName("TC-CG-067: POST /hs-codes/embed-all — embed all HS codes")
    class PostEmbedAll {

        @Test
        @DisplayName("TC-CG-067a: embed สำเร็จ — ส่งคืน 200 + embedded count")
        void embedAll_ok() throws Exception {
            when(hsCodeService.embedAllHsCodes()).thenReturn(15);

            mockMvc.perform(post("/v1/customsguard/hs-codes/embed-all"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.embedded").value(15));
        }
    }
}
