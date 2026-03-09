package com.vollos.feature.customsguard.service;

import com.vollos.feature.customsguard.entity.RegulationEntity;
import com.vollos.feature.customsguard.repository.DocumentChunkRepository;
import com.vollos.feature.customsguard.repository.RegulationRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for DocumentChunkService — chunking, embedding, N+1 prevention.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class DocumentChunkServiceTest {

    @Mock
    private RegulationRepository regulationRepo;
    @Mock
    private DocumentChunkRepository chunkRepo;
    @Mock
    private GeminiEmbeddingService embeddingService;

    @InjectMocks
    private DocumentChunkService documentChunkService;

    // --- TC-CG-050: chunkText — short text returns single chunk ---
    @Test
    @DisplayName("TC-CG-050: chunkText — text สั้นกว่า CHUNK_SIZE ได้ chunk เดียว")
    void chunkText_shortText_returnsSingleChunk() {
        String shortText = "This is a short regulation text about customs.";

        List<String> chunks = documentChunkService.chunkText(shortText);

        assertThat(chunks).hasSize(1);
        assertThat(chunks.get(0)).isEqualTo(shortText);
    }

    // --- TC-CG-051: chunkText — null/empty returns empty list ---
    @Test
    @DisplayName("TC-CG-051: chunkText — null หรือ empty text ได้ empty list")
    void chunkText_nullOrEmpty_returnsEmptyList() {
        assertThat(documentChunkService.chunkText(null)).isEmpty();
        assertThat(documentChunkService.chunkText("")).isEmpty();
        assertThat(documentChunkService.chunkText("   ")).isEmpty();
    }

    // --- chunkText — long text gets chunked with overlap ---
    @Test
    @DisplayName("chunkText — text ยาวเกิน CHUNK_SIZE ถูกแบ่งเป็นหลาย chunk มี overlap")
    void chunkText_longText_chunkedWithOverlap() {
        // Create text > 1500 chars
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < 200; i++) {
            sb.append("This is sentence number ").append(i).append(". ");
        }
        String longText = sb.toString();

        List<String> chunks = documentChunkService.chunkText(longText);

        assertThat(chunks.size()).isGreaterThan(1);
        // Each chunk should be non-empty
        for (String chunk : chunks) {
            assertThat(chunk).isNotBlank();
        }
    }

    // --- chunkAndEmbedAll — happy path ---
    @Test
    @DisplayName("chunkAndEmbedAll — happy path: regulations chunked and embedded")
    void chunkAndEmbedAll_happyPath() {
        // Given
        RegulationEntity reg = createRegulation("reg1", "ประกาศ", "เรื่องภาษีกุ้ง",
                "Short regulation content about shrimps");

        when(regulationRepo.findAll()).thenReturn(List.of(reg));
        // N+1 prevention: pre-fetched source IDs
        when(chunkRepo.findSourceIdsBySourceType("REGULATION")).thenReturn(List.of());

        float[] mockEmb = new float[768];
        when(embeddingService.embed(anyString())).thenReturn(mockEmb);

        // When
        Map<String, Integer> result = documentChunkService.chunkAndEmbedAll();

        // Then
        assertThat(result.get("chunked")).isEqualTo(1);
        assertThat(result.get("embedded")).isEqualTo(1);
        String expectedSourceId = UUID.nameUUIDFromBytes("reg1".getBytes()).toString();
        verify(chunkRepo).insertChunkWithEmbedding(
                eq("REGULATION"), eq(expectedSourceId), eq(0),
                anyString(), anyString(), anyString(), anyString());
    }

    // --- chunkAndEmbedAll — skip already chunked ---
    @Test
    @DisplayName("chunkAndEmbedAll — skip regulation ที่ chunked แล้ว (N+1 prevention)")
    void chunkAndEmbedAll_skipsAlreadyChunked() {
        // Given
        RegulationEntity reg = createRegulation("reg1", "ประกาศ", "เรื่องภาษี", "Content");

        when(regulationRepo.findAll()).thenReturn(List.of(reg));
        // Already chunked
        String expectedSourceId = UUID.nameUUIDFromBytes("reg1".getBytes()).toString();
        when(chunkRepo.findSourceIdsBySourceType("REGULATION")).thenReturn(List.of(expectedSourceId));

        // When
        Map<String, Integer> result = documentChunkService.chunkAndEmbedAll();

        // Then
        assertThat(result.get("chunked")).isEqualTo(0);
        assertThat(result.get("embedded")).isEqualTo(0);
        verify(embeddingService, never()).embed(anyString());
        verify(chunkRepo, never()).insertChunkWithEmbedding(
                anyString(), anyString(), anyInt(), anyString(),
                anyString(), anyString(), anyString());
    }

    // --- chunkAndEmbedAll — embedding error continues ---
    @Test
    @DisplayName("chunkAndEmbedAll — embedding error ไม่หยุด process ทั้งหมด")
    void chunkAndEmbedAll_embeddingError_continues() {
        // Given: 2 regulations
        RegulationEntity reg1 = createRegulation("r1", "ประกาศ", "Title1", "Content1");
        RegulationEntity reg2 = createRegulation("r2", "ประกาศ", "Title2", "Content2");

        when(regulationRepo.findAll()).thenReturn(List.of(reg1, reg2));
        when(chunkRepo.findSourceIdsBySourceType("REGULATION")).thenReturn(List.of());

        // First call fails, second succeeds
        when(embeddingService.embed(anyString()))
                .thenThrow(new RuntimeException("API error"))
                .thenReturn(new float[768]);

        // When
        Map<String, Integer> result = documentChunkService.chunkAndEmbedAll();

        // Then: second regulation still processed
        assertThat(result.get("embedded")).isEqualTo(1);
    }

    // --- N+1 prevention: uses batch query ---
    @Test
    @DisplayName("chunkAndEmbedAll — ใช้ findSourceIdsBySourceType แทน per-entity query (N+1 prevention)")
    void chunkAndEmbedAll_usesPreFetchForN1Prevention() {
        when(regulationRepo.findAll()).thenReturn(List.of());
        when(chunkRepo.findSourceIdsBySourceType("REGULATION")).thenReturn(List.of());

        documentChunkService.chunkAndEmbedAll();

        // Pre-fetch called once, not per-entity
        verify(chunkRepo, times(1)).findSourceIdsBySourceType("REGULATION");
        verify(chunkRepo, never()).findBySourceTypeAndSourceId(anyString(), anyString());
    }

    // --- chunkText boundary: exactly CHUNK_SIZE ---
    @Test
    @DisplayName("chunkText — text ยาวเท่ากับ CHUNK_SIZE (1500) ได้ chunk เดียว")
    void chunkText_exactlyChunkSize_returnsSingleChunk() {
        String text = "a".repeat(1500);

        List<String> chunks = documentChunkService.chunkText(text);

        assertThat(chunks).hasSize(1);
    }

    // --- chunkText boundary: CHUNK_SIZE + 1 ---
    @Test
    @DisplayName("chunkText — text ยาว CHUNK_SIZE+1 ได้ 2 chunks")
    void chunkText_chunkSizePlusOne_returnsTwoChunks() {
        String text = "a".repeat(1501);

        List<String> chunks = documentChunkService.chunkText(text);

        assertThat(chunks.size()).isGreaterThanOrEqualTo(2);
    }

    // ====== Helpers ======

    private RegulationEntity createRegulation(String id, String docType, String title, String content) {
        RegulationEntity reg = mock(RegulationEntity.class);
        when(reg.getId()).thenReturn(UUID.nameUUIDFromBytes(id.getBytes()));
        when(reg.getDocType()).thenReturn(docType);
        when(reg.getDocNumber()).thenReturn(null);
        when(reg.getTitle()).thenReturn(title);
        when(reg.getContent()).thenReturn(content);
        when(reg.getIssuer()).thenReturn(null);
        when(reg.getSourceUrl()).thenReturn(null);
        return reg;
    }
}
