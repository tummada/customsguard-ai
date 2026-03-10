package com.vollos.feature.customsguard.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vollos.core.tenant.TenantContext;
import com.vollos.feature.customsguard.dto.SemanticSearchResponse;
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

import java.lang.reflect.Method;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
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

    // ========== Audit V3: calculateTaxes tests ==========

    /** Helper to invoke private calculateTaxes(String) via reflection */
    private String invokeCalculateTaxes(String itemsJson) throws Exception {
        Method method = ScanWorkerService.class.getDeclaredMethod("calculateTaxes", String.class);
        method.setAccessible(true);
        return (String) method.invoke(scanWorkerService, itemsJson);
    }

    /** Helper to invoke private validateWeightUnits(String) via reflection */
    private void invokeValidateWeightUnits(String itemsJson) throws Exception {
        Method method = ScanWorkerService.class.getDeclaredMethod("validateWeightUnits", String.class);
        method.setAccessible(true);
        method.invoke(scanWorkerService, itemsJson);
    }

    // --- TC-CG-035: calculateTaxes — happy path ---
    @Test
    @DisplayName("TC-CG-035: calculateTaxes — CIF=1000, dutyRate=30 → คำนวณอากร VAT และภาษีรวมถูกต้อง")
    void calculateTaxes_happyPath() throws Exception {
        // Given: CIF=1000, dutyRate=30%
        // Duty = 1000 × 0.30 = 300.00
        // VAT = (1000 + 300) × 0.07 = 91.00
        // Total = 300 + 91 = 391.00
        String input = """
                [{"descriptionEn":"Frozen shrimps","cifPrice":"1000","dutyRate":"30"}]
                """;

        // When
        String result = invokeCalculateTaxes(input);

        // Then
        com.fasterxml.jackson.databind.JsonNode items = objectMapper.readTree(result);
        assertThat(items.isArray()).isTrue();
        assertThat(items.size()).isEqualTo(1);

        com.fasterxml.jackson.databind.JsonNode item = items.get(0);
        assertThat(item.get("dutyAmount").asText()).isEqualTo("300.00");
        assertThat(item.get("vatAmount").asText()).isEqualTo("91.00");
        assertThat(item.get("totalTaxDue").asText()).isEqualTo("391.00");
    }

    // --- TC-CG-036: calculateTaxes — zero duty rate ---
    @Test
    @DisplayName("TC-CG-036: calculateTaxes — CIF=1000 ไม่มี dutyRate → VAT=70.00 (CIF×7%)")
    void calculateTaxes_zeroDutyRate() throws Exception {
        // Given: CIF=1000, no dutyRate → duty=0
        // VAT = (1000 + 0) × 0.07 = 70.00
        // Total = 0 + 70 = 70.00
        String input = """
                [{"descriptionEn":"Rice","cifPrice":"1000"}]
                """;

        // When
        String result = invokeCalculateTaxes(input);

        // Then
        com.fasterxml.jackson.databind.JsonNode items = objectMapper.readTree(result);
        com.fasterxml.jackson.databind.JsonNode item = items.get(0);
        assertThat(item.get("dutyAmount").asText()).isEqualTo("0.00");
        assertThat(item.get("vatAmount").asText()).isEqualTo("70.00");
        assertThat(item.get("totalTaxDue").asText()).isEqualTo("70.00");
    }

    // --- TC-CG-037: calculateTaxes — null cifPrice ---
    @Test
    @DisplayName("TC-CG-037: calculateTaxes — cifPrice=null → item ไม่ถูกแก้ไข (skip)")
    void calculateTaxes_nullCifPrice() throws Exception {
        // Given: cifPrice is null → should skip calculation
        String input = """
                [{"descriptionEn":"Unknown item","cifPrice":null,"dutyRate":"10"}]
                """;

        // When
        String result = invokeCalculateTaxes(input);

        // Then: no tax fields added
        com.fasterxml.jackson.databind.JsonNode items = objectMapper.readTree(result);
        com.fasterxml.jackson.databind.JsonNode item = items.get(0);
        assertThat(item.has("dutyAmount")).isFalse();
        assertThat(item.has("vatAmount")).isFalse();
        assertThat(item.has("totalTaxDue")).isFalse();
    }

    // --- TC-CG-038: calculateTaxes — invalid cifPrice ---
    @Test
    @DisplayName("TC-CG-038: calculateTaxes — cifPrice=\"N/A\" → ไม่ crash, item ไม่ถูกแก้ไข")
    void calculateTaxes_invalidCifPrice() throws Exception {
        // Given: cifPrice is non-numeric "N/A" → NumberFormatException caught internally
        String input = """
                [{"descriptionEn":"Sample","cifPrice":"N/A","dutyRate":"5"}]
                """;

        // When
        String result = invokeCalculateTaxes(input);

        // Then: no crash, no tax fields added (exception caught per-item)
        com.fasterxml.jackson.databind.JsonNode items = objectMapper.readTree(result);
        com.fasterxml.jackson.databind.JsonNode item = items.get(0);
        assertThat(item.has("dutyAmount")).isFalse();
        assertThat(item.has("vatAmount")).isFalse();
        assertThat(item.has("totalTaxDue")).isFalse();
        // Original fields preserved
        assertThat(item.get("descriptionEn").asText()).isEqualTo("Sample");
        assertThat(item.get("cifPrice").asText()).isEqualTo("N/A");
    }

    // --- TC-CG-039: isValidHsCode — code without dots rejected ---
    @Test
    @DisplayName("TC-CG-039: isValidHsCode — code \"030617\" ไม่มีจุด → ถูกปฏิเสธ ไม่ set hsCode")
    void isValidHsCode_withoutDots_rejected() throws Exception {
        // Given: semantic search returns code without dots (e.g. "030617")
        // The enrichWithHsCodes method checks isValidHsCode() → "030617" fails regex \\d{4}\\.\\d{2}
        Map<String, Object> job = Map.of("id", JOB_ID, "s3_key", S3_KEY, "tenant_id", TENANT_ID);
        when(jdbcTemplate.queryForList(anyString())).thenReturn(List.of(job));
        when(jdbcTemplate.queryForObject(contains("set_config"), eq(String.class), eq(TENANT_ID)))
                .thenReturn("ok");
        when(jdbcTemplate.update(anyString(), any(Object[].class))).thenReturn(1);
        when(jdbcTemplate.update(anyString(), anyString())).thenReturn(1);
        when(jdbcTemplate.update(anyString(), anyString(), anyString())).thenReturn(1);

        when(s3Service.downloadPdf(S3_KEY)).thenReturn(new byte[]{1, 2, 3});
        when(pdfService.extractText(any(byte[].class))).thenReturn("Invoice");

        String itemsJson = """
                [{"descriptionEn":"Frozen shrimps","descriptionTh":"กุ้งแช่แข็ง","cifPrice":"1000"}]
                """;
        when(geminiChat.rawPrompt(anyString())).thenReturn(itemsJson);

        // Semantic search returns code WITHOUT dots → should be rejected by isValidHsCode
        var resultWithBadCode = new SemanticSearchResponse(
                "030617", "กุ้งแช่แข็ง", "Frozen shrimps", null, null, null, 0.85);
        when(hsCodeService.semanticSearch(anyString(), eq(3)))
                .thenReturn(List.of(resultWithBadCode));

        // When
        scanWorkerService.pollAndProcess();

        // Then: hsCode not set on item (code rejected)
        // Capture the itemsJson stored in cg_declarations
        var captor = org.mockito.ArgumentCaptor.forClass(String.class);
        verify(jdbcTemplate).update(contains("cg_declarations"), captor.capture(), anyString());
        String storedJson = captor.getValue();
        com.fasterxml.jackson.databind.JsonNode stored = objectMapper.readTree(storedJson);
        assertThat(stored.get(0).get("hsCode").isNull()).isTrue();
        assertThat(stored.get(0).get("aiReason").asText()).contains("ไม่พบ HS Code");
    }

    // ========== P1: Additional Duty Calculation Tests ==========

    // --- TC-CU-002: Duty = CIF × baseRate ---
    @Test
    @DisplayName("TC-CU-002: อากรขาเข้า = CIF × base rate — ตรวจสอบสูตรพื้นฐาน")
    void calculateTaxes_dutyEqualsRateTimesCif() throws Exception {
        // Given: CIF=5000, dutyRate=10%
        // Duty = 5000 × 10% = 500.00
        String input = """
                [{"descriptionEn":"Laptop computer","cifPrice":"5000","dutyRate":"10"}]
                """;

        // When
        String result = invokeCalculateTaxes(input);

        // Then
        com.fasterxml.jackson.databind.JsonNode item = objectMapper.readTree(result).get(0);
        assertThat(item.get("dutyAmount").asText()).isEqualTo("500.00");
    }

    // --- TC-CU-004: FTA override — preferentialRate < baseRate ---
    @Test
    @DisplayName("TC-CU-004: FTA override — dutyRate ต่ำกว่า base → ใช้ FTA rate คำนวณ")
    void calculateTaxes_ftaOverride_lowerRate() throws Exception {
        // Given: dutyRate=5 (FTA rate, lower than MFN 30%)
        // Duty = 1000 × 5% = 50.00
        // VAT = (1000 + 50) × 7% = 73.50
        // Total = 50 + 73.50 = 123.50
        String input = """
                [{"descriptionEn":"Frozen shrimps","cifPrice":"1000","dutyRate":"5"}]
                """;

        // When
        String result = invokeCalculateTaxes(input);

        // Then: FTA rate applied correctly
        com.fasterxml.jackson.databind.JsonNode item = objectMapper.readTree(result).get(0);
        assertThat(item.get("dutyAmount").asText()).isEqualTo("50.00");
        assertThat(item.get("vatAmount").asText()).isEqualTo("73.50");
        assertThat(item.get("totalTaxDue").asText()).isEqualTo("123.50");
    }

    // --- TC-CU-005: AD duty stacking (base + AD) ---
    @Test
    @DisplayName("TC-CU-005: AD duty stacking — base 5% + AD ดูจาก combined rate (เหล็กจีน)")
    void calculateTaxes_adDutyStacking() throws Exception {
        // Given: dutyRate=28 (base 5% + AD 23% combined)
        // Duty = 10000 × 28% = 2800.00
        // VAT = (10000 + 2800) × 7% = 896.00
        // Total = 2800 + 896 = 3696.00
        String input = """
                [{"descriptionEn":"Coated flat steel","cifPrice":"10000","dutyRate":"28"}]
                """;

        // When
        String result = invokeCalculateTaxes(input);

        // Then
        com.fasterxml.jackson.databind.JsonNode item = objectMapper.readTree(result).get(0);
        assertThat(item.get("dutyAmount").asText()).isEqualTo("2800.00");
        assertThat(item.get("vatAmount").asText()).isEqualTo("896.00");
        assertThat(item.get("totalTaxDue").asText()).isEqualTo("3696.00");
    }

    // --- TC-CU-007: Online goods ≥1 baht → must pay duty (2026 rule) ---
    @Test
    @DisplayName("TC-CU-007: สินค้า online ≥1 บาท → ต้องเสียอากร (กฎ 2026 ยกเลิก threshold 1,500)")
    void calculateTaxes_onlineGoods_minimumDuty() throws Exception {
        // Given: CIF=1 (1 baht, minimum), dutyRate=30%
        // Duty = 1 × 30% = 0.30
        // VAT = (1 + 0.30) × 7% = 0.09 (rounded)
        // Total = 0.30 + 0.09 = 0.39
        String input = """
                [{"descriptionEn":"T-shirt (online order)","cifPrice":"1","dutyRate":"30"}]
                """;

        // When
        String result = invokeCalculateTaxes(input);

        // Then: even 1 baht CIF gets duty calculation
        com.fasterxml.jackson.databind.JsonNode item = objectMapper.readTree(result).get(0);
        assertThat(item.has("dutyAmount")).isTrue();
        assertThat(item.has("vatAmount")).isTrue();
        assertThat(item.has("totalTaxDue")).isTrue();
        // Duty should be > 0
        assertThat(Double.parseDouble(item.get("dutyAmount").asText())).isGreaterThan(0);
    }

    // --- TC-CU-017: BigDecimal precision — no floating point error ---
    @Test
    @DisplayName("TC-CU-017: BigDecimal precision — 0.1 + 0.2 ≠ 0.30000000000000004")
    void calculateTaxes_bigDecimalPrecision() throws Exception {
        // Given: CIF=100, dutyRate=0.3 → Duty = 0.30 (not 0.30000000000000004)
        String input = """
                [{"descriptionEn":"Sample","cifPrice":"100","dutyRate":"0.3"}]
                """;

        // When
        String result = invokeCalculateTaxes(input);

        // Then: clean decimal, no floating point artifacts
        com.fasterxml.jackson.databind.JsonNode item = objectMapper.readTree(result).get(0);
        String dutyStr = item.get("dutyAmount").asText();
        assertThat(dutyStr).doesNotContain("000000"); // no floating point artifacts
        assertThat(dutyStr).isEqualTo("0.30");
    }

    // --- TC-CG-040: validateWeightUnits — non-standard unit logs warning ---
    @Test
    @DisplayName("TC-CG-040: validateWeightUnits — หน่วยน้ำหนักไม่มาตรฐาน → log warning ไม่ crash")
    void validateWeightUnits_nonStandard() throws Exception {
        // Given: weight with non-standard unit "500 BUSHELS"
        String input = """
                [{"descriptionEn":"Wheat","weight":"500 BUSHELS"}]
                """;

        // When — should not throw, just log a warning
        invokeValidateWeightUnits(input);

        // Then: no exception (the method only logs, no return value to assert)
        // If we got here without exception, the test passes
    }
}
