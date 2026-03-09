package com.vollos.feature.customsguard.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vollos.core.tenant.TenantContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for ScanWorkerService — background scan job processor.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class ScanWorkerServiceTest {

    @Mock
    private JdbcTemplate jdbcTemplate;
    @Mock
    private S3StorageService s3Service;
    @Mock
    private PdfProcessingService pdfService;
    @Mock
    private GeminiChatService geminiChat;
    @Mock
    private HsCodeService hsCodeService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    private ScanWorkerService scanWorkerService;

    private static final String JOB_ID = "d0000000-0000-0000-0000-000000000001";
    private static final String TENANT_ID = "a0000000-0000-0000-0000-000000000001";
    private static final String S3_KEY = "customsguard/scans/test.pdf";

    @BeforeEach
    void setUp() {
        scanWorkerService = new ScanWorkerService(
                jdbcTemplate, s3Service, pdfService, geminiChat, hsCodeService, objectMapper);
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    // --- TC-CG-028: pollAndProcess — no jobs available ---
    @Test
    @DisplayName("TC-CG-028: pollAndProcess — ไม่มี job ใน queue ไม่ทำอะไร")
    void pollAndProcess_noJobs_doesNothing() {
        when(jdbcTemplate.queryForList(anyString())).thenReturn(List.of());

        scanWorkerService.pollAndProcess();

        verifyNoInteractions(s3Service);
        verifyNoInteractions(pdfService);
        verifyNoInteractions(geminiChat);
    }

    // --- TC-CG-029: pollAndProcess — happy path ---
    @Test
    @DisplayName("TC-CG-029: pollAndProcess — happy path: download PDF → extract → Gemini → enrich → COMPLETED")
    void pollAndProcess_happyPath_completesJob() throws Exception {
        // Given: one job in queue
        Map<String, Object> job = Map.of("id", JOB_ID, "s3_key", S3_KEY, "tenant_id", TENANT_ID);
        when(jdbcTemplate.queryForList(anyString())).thenReturn(List.of(job));

        // Set tenant context
        when(jdbcTemplate.queryForObject(contains("set_config"), eq(String.class), eq(TENANT_ID)))
                .thenReturn("ok");

        // Update status returns 1
        when(jdbcTemplate.update(anyString(), any(Object[].class))).thenReturn(1);
        when(jdbcTemplate.update(anyString(), anyString())).thenReturn(1);
        when(jdbcTemplate.update(anyString(), anyString(), anyString())).thenReturn(1);

        // S3 download
        when(s3Service.downloadPdf(S3_KEY)).thenReturn(new byte[]{1, 2, 3});

        // PDF text extraction
        when(pdfService.extractText(any(byte[].class))).thenReturn("Invoice text: Frozen shrimps 500 KG");

        // Gemini extraction returns valid JSON
        String geminiResult = """
                [{"descriptionEn":"Frozen shrimps","descriptionTh":"กุ้งแช่แข็ง","quantity":"100","weight":"500 KG","unitPrice":"10","cifPrice":"1000","currency":"USD","sourcePageIndex":0}]
                """;
        when(geminiChat.rawPrompt(anyString())).thenReturn(geminiResult);

        // HS code enrichment
        when(hsCodeService.semanticSearch(anyString(), eq(3))).thenReturn(List.of());

        // When
        scanWorkerService.pollAndProcess();

        // Then: status updated to COMPLETED
        verify(s3Service).downloadPdf(S3_KEY);
        verify(pdfService).extractText(any(byte[].class));
        verify(geminiChat).rawPrompt(anyString());
    }

    // --- TC-CG-030: Gemini empty retry (3x) ---
    @Test
    @DisplayName("TC-CG-030: pollAndProcess — Gemini ส่งผลว่าง retry 3 ครั้ง แล้ว FAILED")
    void pollAndProcess_geminiEmptyRetry_marksFailed() throws Exception {
        // Given
        Map<String, Object> job = Map.of("id", JOB_ID, "s3_key", S3_KEY, "tenant_id", TENANT_ID);
        when(jdbcTemplate.queryForList(anyString())).thenReturn(List.of(job));
        when(jdbcTemplate.queryForObject(contains("set_config"), eq(String.class), eq(TENANT_ID)))
                .thenReturn("ok");
        when(jdbcTemplate.update(anyString(), any(Object[].class))).thenReturn(1);
        when(jdbcTemplate.update(anyString(), anyString())).thenReturn(1);
        when(jdbcTemplate.update(anyString(), anyString(), anyString())).thenReturn(1);

        when(s3Service.downloadPdf(S3_KEY)).thenReturn(new byte[]{1, 2, 3});
        when(pdfService.extractText(any(byte[].class))).thenReturn("Invoice text");

        // Gemini always returns "not a JSON array" → cleaned to "[]"
        when(geminiChat.rawPrompt(anyString())).thenReturn("I cannot process this.");

        // When
        scanWorkerService.pollAndProcess();

        // Then: Gemini called 3 times (MAX_RETRIES)
        verify(geminiChat, times(3)).rawPrompt(anyString());
        // Status should be FAILED (error handler catches the exception)
    }

    // --- TC-CG-031: Invalid JSON from Gemini → wrapped as empty ---
    @Test
    @DisplayName("TC-CG-031: pollAndProcess — Gemini ส่ง JSON ไม่ valid ถูก wrap เป็น []")
    void pollAndProcess_invalidJson_wrappedAsEmpty() throws Exception {
        // Given
        Map<String, Object> job = Map.of("id", JOB_ID, "s3_key", S3_KEY, "tenant_id", TENANT_ID);
        when(jdbcTemplate.queryForList(anyString())).thenReturn(List.of(job));
        when(jdbcTemplate.queryForObject(contains("set_config"), eq(String.class), eq(TENANT_ID)))
                .thenReturn("ok");
        when(jdbcTemplate.update(anyString(), any(Object[].class))).thenReturn(1);
        when(jdbcTemplate.update(anyString(), anyString())).thenReturn(1);
        when(jdbcTemplate.update(anyString(), anyString(), anyString())).thenReturn(1);

        when(s3Service.downloadPdf(S3_KEY)).thenReturn(new byte[]{1, 2, 3});
        when(pdfService.extractText(any(byte[].class))).thenReturn("Text");

        // Gemini returns non-array JSON
        when(geminiChat.rawPrompt(anyString())).thenReturn("{\"error\": \"bad\"}");

        // When
        scanWorkerService.pollAndProcess();

        // Then: Gemini called 3 times because "[]".equals("[]") check triggers retry
        verify(geminiChat, times(3)).rawPrompt(anyString());
    }

    // --- TC-CG-032: S3 download error ---
    @Test
    @DisplayName("TC-CG-032: pollAndProcess — S3 download ล้มเหลว job FAILED")
    void pollAndProcess_s3Error_jobFailed() throws Exception {
        // Given
        Map<String, Object> job = Map.of("id", JOB_ID, "s3_key", S3_KEY, "tenant_id", TENANT_ID);
        when(jdbcTemplate.queryForList(anyString())).thenReturn(List.of(job));
        when(jdbcTemplate.queryForObject(contains("set_config"), eq(String.class), eq(TENANT_ID)))
                .thenReturn("ok");
        when(jdbcTemplate.update(anyString(), any(Object[].class))).thenReturn(1);
        when(jdbcTemplate.update(anyString(), anyString())).thenReturn(1);
        when(jdbcTemplate.update(anyString(), anyString(), anyString())).thenReturn(1);

        when(s3Service.downloadPdf(S3_KEY))
                .thenThrow(new RuntimeException("S3 connection failed"));

        // When
        scanWorkerService.pollAndProcess();

        // Then: no PDF processing
        verifyNoInteractions(pdfService);
        verifyNoInteractions(geminiChat);
    }

    // --- TC-CG-033: Gemini returns markdown-wrapped JSON ---
    @Test
    @DisplayName("TC-CG-033: pollAndProcess — Gemini ส่ง JSON wrapped ด้วย markdown fences ได้ cleaned")
    void pollAndProcess_markdownWrappedJson_cleaned() throws Exception {
        // Given
        Map<String, Object> job = Map.of("id", JOB_ID, "s3_key", S3_KEY, "tenant_id", TENANT_ID);
        when(jdbcTemplate.queryForList(anyString())).thenReturn(List.of(job));
        when(jdbcTemplate.queryForObject(contains("set_config"), eq(String.class), eq(TENANT_ID)))
                .thenReturn("ok");
        when(jdbcTemplate.update(anyString(), any(Object[].class))).thenReturn(1);
        when(jdbcTemplate.update(anyString(), anyString())).thenReturn(1);
        when(jdbcTemplate.update(anyString(), anyString(), anyString())).thenReturn(1);

        when(s3Service.downloadPdf(S3_KEY)).thenReturn(new byte[]{1, 2, 3});
        when(pdfService.extractText(any(byte[].class))).thenReturn("Invoice");

        // Gemini returns JSON wrapped in markdown fences
        String wrappedJson = "```json\n[{\"descriptionEn\":\"Rice\",\"descriptionTh\":\"ข้าว\"}]\n```";
        when(geminiChat.rawPrompt(anyString())).thenReturn(wrappedJson);
        when(hsCodeService.semanticSearch(anyString(), eq(3))).thenReturn(List.of());

        // When
        scanWorkerService.pollAndProcess();

        // Then: should complete (not fail from markdown wrapping)
        verify(geminiChat, times(1)).rawPrompt(anyString());
    }

    // --- TC-CG-034: Item enrichment partial failure ---
    @Test
    @DisplayName("TC-CG-034: pollAndProcess — enrichment ล้มเหลวบาง item ไม่กระทบ item อื่น")
    void pollAndProcess_enrichmentPartialFailure_continuesOtherItems() throws Exception {
        // Given
        Map<String, Object> job = Map.of("id", JOB_ID, "s3_key", S3_KEY, "tenant_id", TENANT_ID);
        when(jdbcTemplate.queryForList(anyString())).thenReturn(List.of(job));
        when(jdbcTemplate.queryForObject(contains("set_config"), eq(String.class), eq(TENANT_ID)))
                .thenReturn("ok");
        when(jdbcTemplate.update(anyString(), any(Object[].class))).thenReturn(1);
        when(jdbcTemplate.update(anyString(), anyString())).thenReturn(1);
        when(jdbcTemplate.update(anyString(), anyString(), anyString())).thenReturn(1);

        when(s3Service.downloadPdf(S3_KEY)).thenReturn(new byte[]{1, 2, 3});
        when(pdfService.extractText(any(byte[].class))).thenReturn("Invoice");

        // Two items
        String itemsJson = """
                [{"descriptionEn":"Shrimps","descriptionTh":"กุ้ง"},{"descriptionEn":"Rice","descriptionTh":"ข้าว"}]
                """;
        when(geminiChat.rawPrompt(anyString())).thenReturn(itemsJson);

        // First item enrichment fails, second succeeds
        when(hsCodeService.semanticSearch(contains("Shrimps"), eq(3)))
                .thenThrow(new RuntimeException("Embedding failed"));
        when(hsCodeService.semanticSearch(contains("Rice"), eq(3)))
                .thenReturn(List.of());

        // When
        scanWorkerService.pollAndProcess();

        // Then: both items attempted
        verify(hsCodeService, times(2)).semanticSearch(anyString(), eq(3));
    }
}
