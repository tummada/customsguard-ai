package com.vollos.feature.customsguard.service;

import com.vollos.feature.customsguard.dto.RagSearchResponse;
import com.vollos.feature.customsguard.entity.FtaRateEntity;
import com.vollos.feature.customsguard.repository.DocumentChunkRepository;
import com.vollos.feature.customsguard.repository.FtaRateRepository;
import com.vollos.feature.customsguard.repository.HsCodeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for RagService — RAG search logic (embed, retrieve, filter, answer).
 */
@ExtendWith(MockitoExtension.class)
class RagServiceTest {

    @Mock
    private GeminiEmbeddingService embeddingService;
    @Mock
    private DocumentChunkRepository chunkRepo;
    @Mock
    private HsCodeRepository hsCodeRepo;
    @Mock
    private FtaRateRepository ftaRateRepo;
    @Mock
    private GeminiChatService chatService;

    private RagService ragService;

    @BeforeEach
    void setUp() {
        ragService = new RagService(
                embeddingService, chunkRepo, hsCodeRepo, ftaRateRepo, chatService,
                0.65,   // minSimilarityThreshold
                0.55    // hsCodeSimilarityThreshold
        );
    }

    private static final float[] MOCK_EMBEDDING = new float[]{0.1f, 0.2f, 0.3f};

    /** Helper: wrap Object[] in typed List to avoid generic inference issues. */
    private static List<Object[]> listOf(Object[]... rows) {
        return List.of(rows);
    }

    /** Helper: create a mock FtaRateEntity (protected constructor). */
    private static FtaRateEntity mockFta(String ftaName, String country, String rate) {
        FtaRateEntity fta = mock(FtaRateEntity.class);
        when(fta.getFtaName()).thenReturn(ftaName);
        when(fta.getPartnerCountry()).thenReturn(country);
        when(fta.getPreferentialRate()).thenReturn(new BigDecimal(rate));
        return fta;
    }

    // --- TC-CG-001: Search happy path ---
    @Test
    @DisplayName("TC-CG-001: search — happy path ส่ง query ปกติ ได้คำตอบ + sources")
    void search_happyPath_returnsAnswerAndSources() {
        // Given
        String query = "พิกัดกุ้งแช่แข็ง";
        when(embeddingService.embed(query)).thenReturn(MOCK_EMBEDDING);

        Object[] chunk1 = {"uuid1", "REGULATION", "src1", 0,
                "กุ้งแช่แข็ง อยู่ในพิกัด 0306.17", "summary1",
                "{\"doc_type\":\"ประกาศ\",\"title\":\"เรื่องกุ้ง\"}", 0.85};
        when(chunkRepo.findBySemantic(anyString(), eq(10))).thenReturn(listOf(chunk1));

        Object[] hsRow = {"0306.17", "กุ้งแช่แข็ง", "Frozen shrimps", new BigDecimal("5.00"), "Seafood", "KG", 0.9};
        when(hsCodeRepo.hybridSearch(eq(query), anyString(), eq(16))).thenReturn(listOf(hsRow));

        FtaRateEntity fta = mockFta("ACFTA", "CN", "0.00");
        when(ftaRateRepo.findActiveByHsCode("0306.17")).thenReturn(List.of(fta));

        when(chatService.generateAnswer(eq(query), anyString()))
                .thenReturn("กุ้งแช่แข็งอยู่ในพิกัด 0306.17 อัตราอากร 5%");

        // When
        RagSearchResponse result = ragService.search(query, 5);

        // Then
        assertThat(result.answer()).contains("0306.17");
        assertThat(result.sources()).hasSize(1);
        assertThat(result.sources().get(0).sourceType()).isEqualTo("REGULATION");
        assertThat(result.processingTimeMs()).isGreaterThanOrEqualTo(0);
        verify(embeddingService).embed(query);
        verify(chatService).generateAnswer(eq(query), anyString());
    }

    // --- TC-CG-002: Unavailable topic → disclaimer ---
    @Test
    @DisplayName("TC-CG-002: search — query เกี่ยวกับ anti-dumping ได้ disclaimer")
    void search_unavailableTopic_returnsDisclaimer() {
        String query = "อากร anti-dumping กุ้ง";

        RagSearchResponse result = ragService.search(query, 5);

        assertThat(result.answer()).contains("Anti-Dumping");
        assertThat(result.answer()).contains("dft.go.th");
        assertThat(result.sources()).isEmpty();
        verifyNoInteractions(embeddingService);
        verifyNoInteractions(chatService);
    }

    // --- TC-CG-003: Unavailable topic Thai keyword ---
    @Test
    @DisplayName("TC-CG-003: search — query ภาษาไทย 'ตอบโต้การทุ่มตลาด' ได้ disclaimer")
    void search_unavailableTopicThai_returnsDisclaimer() {
        String query = "อัตราอากรตอบโต้การทุ่มตลาดเหล็ก";
        RagSearchResponse result = ragService.search(query, 5);

        assertThat(result.answer()).contains("กำลังอยู่ในช่วงอัปเดต");
        assertThat(result.sources()).isEmpty();
    }

    // --- TC-CG-004: Empty chunks + no HS context → no relevant data ---
    @Test
    @DisplayName("TC-CG-004: search — ไม่มี chunk ที่เกี่ยวข้อง ได้ข้อความแนะนำ")
    void search_emptyChunksNoHsContext_returnsNoRelevantMsg() {
        String query = "สินค้าที่ไม่มีในระบบ";
        when(embeddingService.embed(query)).thenReturn(MOCK_EMBEDDING);

        Object[] lowScoreChunk = {"uuid1", "REGULATION", "src1", 0,
                "ข้อมูลไม่เกี่ยวข้อง", "summary", "{}", 0.30};
        when(chunkRepo.findBySemantic(anyString(), eq(10))).thenReturn(listOf(lowScoreChunk));
        when(hsCodeRepo.hybridSearch(eq(query), anyString(), eq(16))).thenReturn(Collections.emptyList());

        RagSearchResponse result = ragService.search(query, 5);

        assertThat(result.answer()).contains("ยังไม่พบข้อมูล");
        assertThat(result.answer()).contains("customs.go.th");
        assertThat(result.sources()).isEmpty();
        verifyNoInteractions(chatService);
    }

    // --- TC-CG-005: Embedding error propagates ---
    @Test
    @DisplayName("TC-CG-005: search — embedding service ล้มเหลว ได้ exception")
    void search_embeddingError_throwsException() {
        String query = "กุ้งแช่แข็ง";
        when(embeddingService.embed(query))
                .thenThrow(new RuntimeException("Embedding service unavailable"));

        assertThatThrownBy(() -> ragService.search(query, 5))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Embedding service unavailable");
    }

    // --- TC-CG-006: Similarity threshold filtering ---
    @Test
    @DisplayName("TC-CG-006: search — chunks ที่ similarity < 0.65 ถูกกรองออก")
    void search_similarityThreshold_filtersLowScoreChunks() {
        String query = "คอมพิวเตอร์";
        when(embeddingService.embed(query)).thenReturn(MOCK_EMBEDDING);

        Object[] highScore = {"u1", "REG", "s1", 0, "คอมพิวเตอร์พิกัด 8471", "sum", "{}", 0.88};
        Object[] lowScore = {"u2", "REG", "s2", 1, "ข้อมูลอื่น", "sum2", "{}", 0.50};
        when(chunkRepo.findBySemantic(anyString(), eq(10))).thenReturn(listOf(highScore, lowScore));

        Object[] hsRow = {"8471.30", "คอมพิวเตอร์", "Computer", new BigDecimal("0.00"), "Electronics", "SET", 0.9};
        when(hsCodeRepo.hybridSearch(eq(query), anyString(), eq(16))).thenReturn(listOf(hsRow));
        when(ftaRateRepo.findActiveByHsCode("8471.30")).thenReturn(List.of());
        when(chatService.generateAnswer(eq(query), anyString())).thenReturn("คอมพิวเตอร์อัตรา 0%");

        RagSearchResponse result = ragService.search(query, 5);

        assertThat(result.sources()).hasSize(1);
        assertThat(result.sources().get(0).chunkText()).contains("คอมพิวเตอร์");
    }

    // --- TC-CG-007: HS code prefix lookup triggered by code in query ---
    @Test
    @DisplayName("TC-CG-007: search — query มีเลข HS code ทำ prefix lookup")
    void search_queryWithHsCode_triggersPrefixLookup() {
        String query = "พิกัด 0306.17 อัตราอากร";
        when(embeddingService.embed(query)).thenReturn(MOCK_EMBEDDING);
        when(chunkRepo.findBySemantic(anyString(), eq(10))).thenReturn(Collections.emptyList());
        when(hsCodeRepo.hybridSearch(eq(query), anyString(), eq(16))).thenReturn(Collections.emptyList());

        Object[] prefixRow = {"0306.17.00", "กุ้งแช่แข็ง", "Frozen shrimps", new BigDecimal("5.00")};
        when(hsCodeRepo.findByCodePrefix(eq("0306.17"), eq(15))).thenReturn(listOf(prefixRow));

        when(chatService.generateAnswer(eq(query), anyString())).thenReturn("HS 0306.17 กุ้งแช่แข็ง");

        RagSearchResponse result = ragService.search(query, 5);

        assertThat(result.answer()).isNotNull();
        verify(hsCodeRepo).findByCodePrefix(eq("0306.17"), eq(15));
        verify(chatService).generateAnswer(eq(query), anyString());
    }

    // --- TC-CG-008: Only HS context, no document chunks ---
    @Test
    @DisplayName("TC-CG-008: search — มีแค่ HS context ไม่มี document chunks ยังได้คำตอบ")
    void search_onlyHsContext_stillReturnsAnswer() {
        String query = "กุ้ง";
        when(embeddingService.embed(query)).thenReturn(MOCK_EMBEDDING);
        when(chunkRepo.findBySemantic(anyString(), eq(10))).thenReturn(Collections.emptyList());

        Object[] hsRow = {"0306.17", "กุ้งแช่แข็ง", "Frozen shrimps", new BigDecimal("5.00"), "Seafood", "KG", 0.8};
        when(hsCodeRepo.hybridSearch(eq(query), anyString(), eq(16))).thenReturn(listOf(hsRow));
        when(ftaRateRepo.findActiveByHsCode("0306.17")).thenReturn(List.of());
        when(chatService.generateAnswer(eq(query), anyString())).thenReturn("ข้อมูลกุ้ง");

        RagSearchResponse result = ragService.search(query, 5);

        assertThat(result.answer()).isEqualTo("ข้อมูลกุ้ง");
        assertThat(result.sources()).isEmpty();
    }

    // --- TC-CG-009: Low similarity chunks → confidence disclaimer appended ---
    @Test
    @DisplayName("TC-CG-009: search — chunks มี topScore < minSimilarityThreshold (0.65) ไม่มี HS/prefix context → answer มี confidence disclaimer")
    void search_lowSimilarityChunks_appendsConfidenceDisclaimer() {
        // Given: first chunk (topScore source) is below threshold, second chunk is above.
        // This makes topScore < 0.65 while relevant list still has one passing chunk,
        // so we get past the "no relevant data" early return but trigger the disclaimer.
        String query = "สินค้าทดสอบ";
        when(embeddingService.embed(query)).thenReturn(MOCK_EMBEDDING);

        Object[] lowScoreFirst = {"u1", "REG", "s1", 0, "ข้อมูลไม่เกี่ยว", "sum1", "{}", 0.40};
        Object[] aboveThreshold = {"u2", "REG", "s2", 1, "สินค้าทดสอบ", "sum2", "{}", 0.70};
        when(chunkRepo.findBySemantic(anyString(), eq(10))).thenReturn(listOf(lowScoreFirst, aboveThreshold));

        // No HS code context and no prefix context
        when(hsCodeRepo.hybridSearch(eq(query), anyString(), eq(16))).thenReturn(Collections.emptyList());

        when(chatService.generateAnswer(eq(query), anyString())).thenReturn("คำตอบจาก Gemini");

        // When
        RagSearchResponse result = ragService.search(query, 5);

        // Then: answer should have the confidence disclaimer appended
        assertThat(result.answer()).contains("คำตอบจาก Gemini");
        assertThat(result.answer()).contains("⚠️ ข้อมูลนี้มีความเกี่ยวข้องต่ำ");
        assertThat(result.answer()).contains("customs.go.th");
        // Only the above-threshold chunk should be in sources
        assertThat(result.sources()).hasSize(1);
        assertThat(result.sources().get(0).chunkText()).contains("สินค้าทดสอบ");
    }

    // --- TC-CG-010: Four-digit code in query triggers prefix lookup ---
    @Test
    @DisplayName("TC-CG-010: search — query มีเลข 4 หลัก '0306' ทำ prefix lookup ด้วย findByCodePrefix")
    void search_queryWithFourDigitCode_triggersPrefixLookup() {
        // Given: query contains a 4-digit HS heading → buildCodePrefixContext matches via HS_CODE_IN_QUERY regex
        String query = "พิกัด 0306 ทั่วไป";
        when(embeddingService.embed(query)).thenReturn(MOCK_EMBEDDING);
        when(chunkRepo.findBySemantic(anyString(), eq(10))).thenReturn(Collections.emptyList());
        when(hsCodeRepo.hybridSearch(eq(query), anyString(), eq(16))).thenReturn(Collections.emptyList());

        Object[] prefixRow = {"0306.17.00", "กุ้งแช่แข็ง", "Frozen shrimps", new BigDecimal("5.00")};
        when(hsCodeRepo.findByCodePrefix(eq("0306"), eq(15))).thenReturn(listOf(prefixRow));

        when(chatService.generateAnswer(eq(query), anyString())).thenReturn("HS 0306 กุ้งแช่แข็ง");

        // When
        RagSearchResponse result = ragService.search(query, 5);

        // Then: prefix lookup was called with "0306"
        assertThat(result.answer()).isNotNull();
        verify(hsCodeRepo).findByCodePrefix(eq("0306"), eq(15));
        verify(chatService).generateAnswer(eq(query), anyString());
    }
}
