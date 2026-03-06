package com.vollos.feature.customsguard.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

/**
 * Background worker that processes scan jobs.
 * Polls ai_jobs with status=CREATED, downloads PDF from S3,
 * extracts text (PDFBox + Gemini Vision fallback),
 * sends to Gemini for HS code classification, and saves results.
 */
@Service
public class ScanWorkerService {

    private static final Logger log = LoggerFactory.getLogger(ScanWorkerService.class);

    private final JdbcTemplate jdbcTemplate;
    private final S3StorageService s3Service;
    private final PdfProcessingService pdfService;
    private final GeminiChatService geminiChat;
    private final ObjectMapper objectMapper;

    public ScanWorkerService(JdbcTemplate jdbcTemplate,
                             S3StorageService s3Service,
                             PdfProcessingService pdfService,
                             GeminiChatService geminiChat,
                             ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.s3Service = s3Service;
        this.pdfService = pdfService;
        this.geminiChat = geminiChat;
        this.objectMapper = objectMapper;
    }

    private static final int MAX_RETRIES = 3;
    private static final long RETRY_DELAY_MS = 15_000;

    @Scheduled(fixedDelay = 15_000, initialDelay = 30_000)
    public void pollAndProcess() {
        // Pick one CREATED job (oldest first)
        List<Map<String, Object>> jobs = jdbcTemplate.queryForList("""
            SELECT j.id, j.prompt AS s3_key, j.tenant_id
            FROM ai_jobs j
            WHERE j.status = 'CREATED'
              AND j.model_type = 'customsguard-scan'
            ORDER BY j.created_at ASC
            LIMIT 1
            """);

        if (jobs.isEmpty()) return;

        Map<String, Object> job = jobs.get(0);
        String jobId = job.get("id").toString();
        String s3Key = (String) job.get("s3_key");
        String tenantId = job.get("tenant_id").toString();

        log.info("Processing scan job: jobId={}, s3Key={}", jobId, s3Key);

        try {
            // Set tenant context for RLS (parameterized to prevent SQL injection)
            jdbcTemplate.queryForObject(
                    "SELECT set_config('app.current_tenant_id', ?, false)",
                    String.class, tenantId);

            // 1. Update status → PROCESSING
            jdbcTemplate.update("""
                UPDATE ai_jobs SET status = 'PROCESSING', progress = 10, updated_at = NOW()
                WHERE id = ?::uuid
                """, jobId);

            // 2. Download PDF from S3
            byte[] pdfBytes = s3Service.downloadPdf(s3Key);
            log.info("Downloaded PDF: {} bytes", pdfBytes.length);

            jdbcTemplate.update("""
                UPDATE ai_jobs SET progress = 30, updated_at = NOW()
                WHERE id = ?::uuid
                """, jobId);

            // 3. Extract text from PDF
            String extractedText = pdfService.extractText(pdfBytes);
            log.info("Extracted text: {} chars", extractedText.length());

            jdbcTemplate.update("""
                UPDATE ai_jobs SET progress = 50, updated_at = NOW()
                WHERE id = ?::uuid
                """, jobId);

            // 4. Send to Gemini for HS code classification (with retry for rate limits)
            String itemsJson = null;
            for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {
                itemsJson = classifyWithGemini(extractedText);
                if (!"[]".equals(itemsJson)) break;

                if (attempt < MAX_RETRIES) {
                    log.warn("Gemini returned empty (attempt {}/{}), retrying in {}s...",
                            attempt, MAX_RETRIES, RETRY_DELAY_MS / 1000);
                    Thread.sleep(RETRY_DELAY_MS);
                }
            }
            log.info("Gemini classification result: {} chars", itemsJson.length());

            // If still empty after retries, mark as FAILED
            if ("[]".equals(itemsJson)) {
                throw new RuntimeException("Gemini returned empty result after " + MAX_RETRIES + " retries");
            }

            jdbcTemplate.update("""
                UPDATE ai_jobs SET progress = 80, updated_at = NOW()
                WHERE id = ?::uuid
                """, jobId);

            // 5. Validate JSON
            objectMapper.readTree(itemsJson);

            // 6. Update job → COMPLETED + save items
            jdbcTemplate.update("""
                UPDATE ai_jobs SET status = 'COMPLETED', progress = 100, updated_at = NOW()
                WHERE id = ?::uuid
                """, jobId);

            jdbcTemplate.update("""
                UPDATE cg_declarations SET items = ?::jsonb, status = 'COMPLETED', updated_at = NOW()
                WHERE ai_job_id = ?::uuid
                """, itemsJson, jobId);

            log.info("Scan job COMPLETED: jobId={}", jobId);

        } catch (Exception e) {
            log.error("Scan job FAILED: jobId={}", jobId, e);

            try {
                jdbcTemplate.queryForObject(
                        "SELECT set_config('app.current_tenant_id', ?, false)",
                        String.class, tenantId);
                jdbcTemplate.update("""
                    UPDATE ai_jobs SET status = 'FAILED', progress = 0, updated_at = NOW()
                    WHERE id = ?::uuid
                    """, jobId);
                jdbcTemplate.update("""
                    UPDATE cg_declarations SET status = 'FAILED', updated_at = NOW()
                    WHERE ai_job_id = ?::uuid
                    """, jobId);
            } catch (Exception ex) {
                log.error("Failed to update job status to FAILED", ex);
            }
        }
    }

    private String classifyWithGemini(String invoiceText) {
        String prompt = """
            คุณคือผู้เชี่ยวชาญด้านพิกัดศุลกากรไทย (HS Code Classifier)

            จากข้อความ invoice ด้านล่าง ให้วิเคราะห์และจำแนกสินค้าทุกรายการ
            ตอบเป็น JSON array เท่านั้น ไม่ต้องมีคำอธิบาย ไม่ต้องมี markdown

            แต่ละรายการมี fields:
            - hsCode: พิกัด HS 6-10 หลัก (เช่น "0306.17.10")
            - descriptionTh: คำอธิบายภาษาไทย
            - descriptionEn: คำอธิบายภาษาอังกฤษ (จาก invoice)
            - quantity: จำนวน (string)
            - weight: น้ำหนัก (string, รวมหน่วย เช่น "500 KG")
            - unitPrice: ราคาต่อหน่วย (string)
            - cifPrice: ราคา CIF รวม (string)
            - currency: สกุลเงิน (เช่น "USD", "THB")
            - confidence: ความมั่นใจ 0.0-1.0
            - aiReason: เหตุผลสั้นๆ ว่าทำไมจึงเลือก HS code นี้
            - sourcePageIndex: หน้าที่พบข้อมูล (เริ่มจาก 0)

            ถ้าไม่มีข้อมูลในช่องไหน ให้ใส่ null
            ถ้าไม่แน่ใจ HS code ให้ confidence ต่ำ (< 0.5)

            === INVOICE TEXT ===
            """ + invoiceText + """

            === END ===

            ตอบ JSON array เท่านั้น:
            """;

        String response = geminiChat.rawPrompt(prompt);

        // Clean up Gemini response — remove markdown fences if present
        String cleaned = response.strip();
        if (cleaned.startsWith("```json")) {
            cleaned = cleaned.substring(7);
        } else if (cleaned.startsWith("```")) {
            cleaned = cleaned.substring(3);
        }
        if (cleaned.endsWith("```")) {
            cleaned = cleaned.substring(0, cleaned.length() - 3);
        }
        cleaned = cleaned.strip();

        // Validate it's a JSON array
        if (!cleaned.startsWith("[")) {
            log.warn("Gemini response is not a JSON array, wrapping: {}", cleaned.substring(0, Math.min(100, cleaned.length())));
            cleaned = "[]";
        }

        return cleaned;
    }
}
