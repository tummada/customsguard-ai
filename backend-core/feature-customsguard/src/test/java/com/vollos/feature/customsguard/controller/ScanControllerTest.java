package com.vollos.feature.customsguard.controller;

import com.vollos.core.quota.QuotaExceededException;
import com.vollos.core.quota.QuotaExceptionHandler;
import com.vollos.core.quota.UsageQuotaService;
import com.vollos.core.tenant.TenantContext;
import com.vollos.feature.customsguard.dto.ScanJobResponse;
import com.vollos.feature.customsguard.service.ScanService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Standalone MockMvc tests for ScanController (no Spring Boot context needed).
 */
@ExtendWith(MockitoExtension.class)
class ScanControllerTest {

    @Mock
    private ScanService scanService;
    @Mock
    private UsageQuotaService usageQuotaService;

    @InjectMocks
    private ScanController scanController;

    private MockMvc mockMvc;

    private static final UUID TENANT_ID = UUID.fromString("a0000000-0000-0000-0000-000000000001");
    private static final byte[] VALID_PDF_CONTENT = {0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34};

    @BeforeEach
    void setUp() {
        TenantContext.setCurrentTenantId(TENANT_ID);
        mockMvc = MockMvcBuilders.standaloneSetup(scanController)
                .setControllerAdvice(new QuotaExceptionHandler())
                .build();
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    // --- TC-CG-017: Valid PDF upload → 202 Accepted ---
    @Test
    @DisplayName("TC-CG-017: POST /scan — valid PDF upload ได้ 202 + jobId")
    void uploadPdf_validPdf_returns202() throws Exception {
        UUID jobId = UUID.randomUUID();
        when(usageQuotaService.checkAndIncrement(any(UUID.class), eq("scan"))).thenReturn(2);
        when(scanService.submitScanJob(eq(TENANT_ID), any(), eq("IMPORT")))
                .thenReturn(new ScanJobResponse(jobId, "CREATED", (short) 0, "s3key"));

        MockMultipartFile file = new MockMultipartFile(
                "file", "invoice.pdf", "application/pdf", VALID_PDF_CONTENT);

        mockMvc.perform(multipart("/v1/customsguard/scan")
                        .file(file)
                        .param("declarationType", "IMPORT"))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.jobId").value(jobId.toString()))
                .andExpect(jsonPath("$.status").value("CREATED"));
    }

    // --- TC-CG-018: Invalid declarationType → 400 ---
    @Test
    @DisplayName("TC-CG-018: POST /scan — invalid declarationType ได้ 400")
    void uploadPdf_invalidDeclarationType_returns400() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file", "invoice.pdf", "application/pdf", VALID_PDF_CONTENT);

        mockMvc.perform(multipart("/v1/customsguard/scan")
                        .file(file)
                        .param("declarationType", "SMUGGLE"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value(containsString("Invalid declarationType")));

        verifyNoInteractions(scanService);
    }

    // --- TC-CG-019: File too large → 400 ---
    @Test
    @DisplayName("TC-CG-019: POST /scan — file > 10MB ได้ 400")
    void uploadPdf_fileTooLarge_returns400() throws Exception {
        when(usageQuotaService.checkAndIncrement(any(UUID.class), eq("scan"))).thenReturn(2);
        when(scanService.submitScanJob(eq(TENANT_ID), any(), eq("IMPORT")))
                .thenThrow(new IllegalArgumentException("File size exceeds 10MB limit"));

        MockMultipartFile file = new MockMultipartFile(
                "file", "large.pdf", "application/pdf", VALID_PDF_CONTENT);

        mockMvc.perform(multipart("/v1/customsguard/scan")
                        .file(file)
                        .param("declarationType", "IMPORT"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value(containsString("10MB")));
    }

    // --- TC-CG-020: Non-PDF file → 400 ---
    @Test
    @DisplayName("TC-CG-020: POST /scan — non-PDF file ได้ 400")
    void uploadPdf_nonPdf_returns400() throws Exception {
        when(usageQuotaService.checkAndIncrement(any(UUID.class), eq("scan"))).thenReturn(2);
        when(scanService.submitScanJob(eq(TENANT_ID), any(), eq("IMPORT")))
                .thenThrow(new IllegalArgumentException("Invalid file: not a PDF document"));

        MockMultipartFile file = new MockMultipartFile(
                "file", "image.jpg", "image/jpeg", new byte[]{(byte) 0xFF, (byte) 0xD8});

        mockMvc.perform(multipart("/v1/customsguard/scan")
                        .file(file)
                        .param("declarationType", "IMPORT"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value(containsString("not a PDF")));
    }

    // --- TC-CG-021: Poll status 200 ---
    @Test
    @DisplayName("TC-CG-021: GET /scan/{jobId} — job exists ได้ 200 + status")
    void getJobStatus_exists_returns200() throws Exception {
        UUID jobId = UUID.randomUUID();
        ScanJobResponse response = new ScanJobResponse(jobId, "PROCESSING", (short) 50, "s3key");
        when(scanService.getJobStatus(TENANT_ID, jobId)).thenReturn(response);

        mockMvc.perform(get("/v1/customsguard/scan/" + jobId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PROCESSING"))
                .andExpect(jsonPath("$.progress").value(50));
    }

    // --- TC-CG-022: Poll status 404 ---
    @Test
    @DisplayName("TC-CG-022: GET /scan/{jobId} — job not found ได้ 404")
    void getJobStatus_notFound_returns404() throws Exception {
        UUID jobId = UUID.randomUUID();
        when(scanService.getJobStatus(TENANT_ID, jobId)).thenReturn(null);

        mockMvc.perform(get("/v1/customsguard/scan/" + jobId))
                .andExpect(status().isNotFound());
    }

    // --- TC-CG-023: Quota exceeded → 429 ---
    @Test
    @DisplayName("TC-CG-023: POST /scan — quota exceeded ได้ 429")
    void uploadPdf_quotaExceeded_returns429() throws Exception {
        when(usageQuotaService.checkAndIncrement(any(UUID.class), eq("scan")))
                .thenThrow(new QuotaExceededException("scan", 4, 3, "FREE"));

        MockMultipartFile file = new MockMultipartFile(
                "file", "invoice.pdf", "application/pdf", VALID_PDF_CONTENT);

        mockMvc.perform(multipart("/v1/customsguard/scan")
                        .file(file)
                        .param("declarationType", "IMPORT"))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.error").value("QUOTA_EXCEEDED"))
                .andExpect(jsonPath("$.usageType").value("scan"));
    }

    // --- TC-CG-024: EXPORT declarationType → 202 ---
    @Test
    @DisplayName("TC-CG-024: POST /scan — EXPORT declarationType ได้ 202")
    void uploadPdf_exportType_returns202() throws Exception {
        UUID jobId = UUID.randomUUID();
        when(usageQuotaService.checkAndIncrement(any(UUID.class), eq("scan"))).thenReturn(2);
        when(scanService.submitScanJob(eq(TENANT_ID), any(), eq("EXPORT")))
                .thenReturn(new ScanJobResponse(jobId, "CREATED", (short) 0, "s3key"));

        MockMultipartFile file = new MockMultipartFile(
                "file", "invoice.pdf", "application/pdf", VALID_PDF_CONTENT);

        mockMvc.perform(multipart("/v1/customsguard/scan")
                        .file(file)
                        .param("declarationType", "EXPORT"))
                .andExpect(status().isAccepted());
    }

    // --- TC-CG-025: Completed job with items ---
    @Test
    @DisplayName("TC-CG-025: GET /scan/{jobId} — COMPLETED job มี items")
    void getJobStatus_completed_returnsItems() throws Exception {
        UUID jobId = UUID.randomUUID();
        List<ScanJobResponse.ExtractedItem> items = List.of(
                new ScanJobResponse.ExtractedItem(
                        "0306.17", "กุ้งแช่แข็ง", "Frozen shrimps",
                        "100", "500 KG", "10.00", "1000.00", "USD",
                        0.85, "Semantic search", 0));

        ScanJobResponse response = new ScanJobResponse(jobId, "COMPLETED", (short) 100, "s3key", items);
        when(scanService.getJobStatus(TENANT_ID, jobId)).thenReturn(response);

        mockMvc.perform(get("/v1/customsguard/scan/" + jobId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"))
                .andExpect(jsonPath("$.items", hasSize(1)))
                .andExpect(jsonPath("$.items[0].hsCode").value("0306.17"));
    }

    // --- TC-CG-026: Too many concurrent jobs → 429 ---
    @Test
    @DisplayName("TC-CG-026: POST /scan — too many concurrent jobs ได้ 429")
    void uploadPdf_tooManyConcurrentJobs_returns429() throws Exception {
        when(usageQuotaService.checkAndIncrement(any(UUID.class), eq("scan"))).thenReturn(2);
        when(scanService.submitScanJob(eq(TENANT_ID), any(), eq("IMPORT")))
                .thenThrow(new IllegalStateException("Too many active scan jobs (5/5)"));

        MockMultipartFile file = new MockMultipartFile(
                "file", "invoice.pdf", "application/pdf", VALID_PDF_CONTENT);

        mockMvc.perform(multipart("/v1/customsguard/scan")
                        .file(file)
                        .param("declarationType", "IMPORT"))
                .andExpect(status().isTooManyRequests());
    }

    // --- TC-CG-028: TRANSIT declarationType → 202 ---
    @Test
    @DisplayName("TC-CG-028: POST /scan — TRANSIT declarationType ได้ 202")
    void uploadPdf_transitType_returns202() throws Exception {
        UUID jobId = UUID.randomUUID();
        when(usageQuotaService.checkAndIncrement(any(UUID.class), eq("scan"))).thenReturn(2);
        when(scanService.submitScanJob(eq(TENANT_ID), any(), eq("TRANSIT")))
                .thenReturn(new ScanJobResponse(jobId, "CREATED", (short) 0, "s3key"));

        MockMultipartFile file = new MockMultipartFile(
                "file", "invoice.pdf", "application/pdf", VALID_PDF_CONTENT);

        mockMvc.perform(multipart("/v1/customsguard/scan")
                        .file(file)
                        .param("declarationType", "TRANSIT"))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.jobId").value(jobId.toString()))
                .andExpect(jsonPath("$.status").value("CREATED"));
    }

    // --- TC-CG-029: TRANSSHIPMENT declarationType → 202 ---
    @Test
    @DisplayName("TC-CG-029: POST /scan — TRANSSHIPMENT declarationType ได้ 202")
    void uploadPdf_transshipmentType_returns202() throws Exception {
        UUID jobId = UUID.randomUUID();
        when(usageQuotaService.checkAndIncrement(any(UUID.class), eq("scan"))).thenReturn(2);
        when(scanService.submitScanJob(eq(TENANT_ID), any(), eq("TRANSSHIPMENT")))
                .thenReturn(new ScanJobResponse(jobId, "CREATED", (short) 0, "s3key"));

        MockMultipartFile file = new MockMultipartFile(
                "file", "invoice.pdf", "application/pdf", VALID_PDF_CONTENT);

        mockMvc.perform(multipart("/v1/customsguard/scan")
                        .file(file)
                        .param("declarationType", "TRANSSHIPMENT"))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.jobId").value(jobId.toString()))
                .andExpect(jsonPath("$.status").value("CREATED"));
    }

    // --- TC-CG-027: No tenant context for getJobStatus → 403 ---
    @Test
    @DisplayName("TC-CG-027: GET /scan/{jobId} — no tenant context ได้ 403")
    void getJobStatus_noTenant_returns403() throws Exception {
        TenantContext.clear();
        UUID jobId = UUID.randomUUID();

        mockMvc.perform(get("/v1/customsguard/scan/" + jobId))
                .andExpect(status().isForbidden());
    }
}
