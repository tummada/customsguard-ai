package com.vollos.feature.customsguard.service;

import com.vollos.feature.customsguard.dto.HsCodeResponse;
import com.vollos.feature.customsguard.dto.SemanticSearchResponse;
import com.vollos.feature.customsguard.entity.HsCodeEntity;
import com.vollos.feature.customsguard.repository.HsCodeRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for HsCodeService.
 * TC-CG-060 to TC-CG-069
 */
@ExtendWith(MockitoExtension.class)
class HsCodeServiceTest {

    @Mock
    private HsCodeRepository hsCodeRepo;

    @Mock
    private GeminiEmbeddingService embeddingService;

    @InjectMocks
    private HsCodeService hsCodeService;

    // --- helpers ---

    private HsCodeEntity buildHsCodeEntity(String code, String descTh, String descEn,
                                            String baseRate, String category) {
        HsCodeEntity entity = new HsCodeEntity(code);
        entity.setDescriptionTh(descTh);
        entity.setDescriptionEn(descEn);
        entity.setBaseRate(new BigDecimal(baseRate));
        entity.setCategory(category);
        entity.setUnit("KG");
        entity.setSection((short) 1);
        entity.setChapter((short) 10);
        entity.setEmbedded(false);
        return entity;
    }

    // ===== TC-CG-060: text search =====

    @Nested
    @DisplayName("TC-CG-060: search — ค้นหาด้วย text query")
    class TextSearch {

        @Test
        @DisplayName("TC-CG-060a: ค้นหาพบผลลัพธ์ — ส่งคืน Page<HsCodeResponse> ถูกต้อง")
        void search_returnsPageOfResponses() {
            // Given
            HsCodeEntity rice = buildHsCodeEntity("1006.30", "ข้าวขาว",
                    "Semi-milled rice", "30.00", "Cereals");
            Pageable pageable = PageRequest.of(0, 10);
            Page<HsCodeEntity> entityPage = new PageImpl<>(List.of(rice), pageable, 1);
            when(hsCodeRepo.search("rice", pageable)).thenReturn(entityPage);

            // When
            Page<HsCodeResponse> result = hsCodeService.search("rice", pageable);

            // Then
            assertThat(result.getTotalElements()).isEqualTo(1);
            HsCodeResponse dto = result.getContent().get(0);
            assertThat(dto.code()).isEqualTo("1006.30");
            assertThat(dto.descriptionTh()).isEqualTo("ข้าวขาว");
            assertThat(dto.descriptionEn()).isEqualTo("Semi-milled rice");
            assertThat(dto.baseRate()).isEqualByComparingTo(new BigDecimal("30.00"));
            assertThat(dto.unit()).isEqualTo("KG");
            assertThat(dto.category()).isEqualTo("Cereals");
            assertThat(dto.section()).isEqualTo((short) 1);
            assertThat(dto.chapter()).isEqualTo((short) 10);
        }

        @Test
        @DisplayName("TC-CG-060b: ค้นหาไม่พบ — ส่งคืน empty page")
        void search_emptyResult() {
            // Given
            Pageable pageable = PageRequest.of(0, 10);
            when(hsCodeRepo.search("nonexistent", pageable))
                    .thenReturn(Page.empty(pageable));

            // When
            Page<HsCodeResponse> result = hsCodeService.search("nonexistent", pageable);

            // Then
            assertThat(result.getTotalElements()).isZero();
            assertThat(result.getContent()).isEmpty();
        }
    }

    // ===== TC-CG-061: semantic search =====

    @Nested
    @DisplayName("TC-CG-061: semanticSearch — ค้นหาด้วย vector similarity")
    class SemanticSearch {

        @Test
        @DisplayName("TC-CG-061a: semantic search พบผลลัพธ์ — map Object[] เป็น SemanticSearchResponse ถูกต้อง")
        void semanticSearch_returnsResults() {
            // Given
            float[] embedding = {0.1f, 0.2f, 0.3f};
            when(embeddingService.embed("shrimp")).thenReturn(embedding);

            Object[] row = {"0306.17", "กุ้งแช่แข็ง", "Frozen shrimps",
                    new BigDecimal("5.00"), "Seafood", "KG", 0.95};
            when(hsCodeRepo.findBySemantic(anyString(), eq(5)))
                    .thenReturn(List.<Object[]>of(row));

            // When
            List<SemanticSearchResponse> result = hsCodeService.semanticSearch("shrimp", 5);

            // Then
            assertThat(result).hasSize(1);
            SemanticSearchResponse resp = result.get(0);
            assertThat(resp.code()).isEqualTo("0306.17");
            assertThat(resp.descriptionTh()).isEqualTo("กุ้งแช่แข็ง");
            assertThat(resp.descriptionEn()).isEqualTo("Frozen shrimps");
            assertThat(resp.baseRate()).isEqualByComparingTo(new BigDecimal("5.00"));
            assertThat(resp.category()).isEqualTo("Seafood");
            assertThat(resp.unit()).isEqualTo("KG");
            assertThat(resp.similarity()).isEqualTo(0.95);

            verify(embeddingService).embed("shrimp");
        }

        @Test
        @DisplayName("TC-CG-061b: semantic search ไม่พบ — ส่งคืน empty list")
        void semanticSearch_emptyResult() {
            // Given
            float[] embedding = {0.1f, 0.2f};
            when(embeddingService.embed("xyz")).thenReturn(embedding);
            when(hsCodeRepo.findBySemantic(anyString(), eq(10)))
                    .thenReturn(Collections.emptyList());

            // When
            List<SemanticSearchResponse> result = hsCodeService.semanticSearch("xyz", 10);

            // Then
            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("TC-CG-061c: semantic search — row ที่มี null baseRate และ similarity จัดการได้")
        void semanticSearch_nullFields() {
            // Given
            float[] embedding = {0.5f};
            when(embeddingService.embed("test")).thenReturn(embedding);

            Object[] row = {"9999.99", "ทดสอบ", "Test", null, "Test", null, null};
            when(hsCodeRepo.findBySemantic(anyString(), eq(5)))
                    .thenReturn(List.<Object[]>of(row));

            // When
            List<SemanticSearchResponse> result = hsCodeService.semanticSearch("test", 5);

            // Then
            assertThat(result).hasSize(1);
            assertThat(result.get(0).baseRate()).isNull();
            assertThat(result.get(0).similarity()).isNull();
        }
    }

    // ===== TC-CG-062: embedAllHsCodes =====

    @Nested
    @DisplayName("TC-CG-062: embedAllHsCodes — embed HS codes ที่ยังไม่มี embedding")
    class EmbedAll {

        @Test
        @DisplayName("TC-CG-062a: มี 2 codes ที่ยังไม่ embed — embed ทั้ง 2 สำเร็จ")
        void embedAll_embedsTwoCodes() {
            // Given
            HsCodeEntity e1 = buildHsCodeEntity("1006.30", "ข้าวขาว", "Rice", "30", "Cereals");
            HsCodeEntity e2 = buildHsCodeEntity("0306.17", "กุ้ง", "Shrimp", "5", "Seafood");
            when(hsCodeRepo.findByEmbeddedFalse()).thenReturn(List.of(e1, e2));
            when(embeddingService.embed(anyString())).thenReturn(new float[]{0.1f, 0.2f});

            // When
            int count = hsCodeService.embedAllHsCodes();

            // Then
            assertThat(count).isEqualTo(2);
            verify(hsCodeRepo, times(2)).updateEmbedding(anyString(), anyString());
        }

        @Test
        @DisplayName("TC-CG-062b: ไม่มี codes ที่ต้อง embed — return 0")
        void embedAll_noCodesToEmbed() {
            // Given
            when(hsCodeRepo.findByEmbeddedFalse()).thenReturn(Collections.emptyList());

            // When
            int count = hsCodeService.embedAllHsCodes();

            // Then
            assertThat(count).isZero();
            verify(hsCodeRepo, never()).updateEmbedding(anyString(), anyString());
        }

        @Test
        @DisplayName("TC-CG-062c: embed บาง code ล้มเหลว — ข้ามแล้วทำต่อ ไม่ throw")
        void embedAll_partialFailure() {
            // Given
            HsCodeEntity e1 = buildHsCodeEntity("1006.30", "ข้าวขาว", "Rice", "30", "Cereals");
            HsCodeEntity e2 = buildHsCodeEntity("0306.17", "กุ้ง", "Shrimp", "5", "Seafood");
            when(hsCodeRepo.findByEmbeddedFalse()).thenReturn(List.of(e1, e2));
            when(embeddingService.embed(anyString()))
                    .thenThrow(new RuntimeException("API error"))
                    .thenReturn(new float[]{0.1f});

            // When
            int count = hsCodeService.embedAllHsCodes();

            // Then
            assertThat(count).isEqualTo(1);
            verify(hsCodeRepo, times(1)).updateEmbedding(anyString(), anyString());
        }
    }

    // ===== TC-CG-063: seedSampleHsCodes =====

    @Nested
    @DisplayName("TC-CG-063: seedSampleHsCodes — seed ข้อมูลตัวอย่าง")
    class Seed {

        @Test
        @DisplayName("TC-CG-063a: DB ว่าง — seed 20 records สำเร็จ")
        void seed_emptyDb_seeds20() {
            // Given
            when(hsCodeRepo.count()).thenReturn(0L);
            when(hsCodeRepo.save(any(HsCodeEntity.class)))
                    .thenAnswer(inv -> inv.getArgument(0));

            // When
            int count = hsCodeService.seedSampleHsCodes();

            // Then
            assertThat(count).isEqualTo(20);
            verify(hsCodeRepo, times(20)).save(any(HsCodeEntity.class));
        }

        @Test
        @DisplayName("TC-CG-063b: DB มีข้อมูลแล้ว — ไม่ seed, return 0")
        void seed_nonEmptyDb_returnsZero() {
            // Given
            when(hsCodeRepo.count()).thenReturn(5L);

            // When
            int count = hsCodeService.seedSampleHsCodes();

            // Then
            assertThat(count).isZero();
            verify(hsCodeRepo, never()).save(any(HsCodeEntity.class));
        }
    }
}
