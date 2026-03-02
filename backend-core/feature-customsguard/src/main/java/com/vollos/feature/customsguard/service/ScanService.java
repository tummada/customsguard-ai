package com.vollos.feature.customsguard.service;

import com.vollos.feature.customsguard.dto.ScanJobResponse;
import com.vollos.core.shared.UUIDv7;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.UUID;

@Service
public class ScanService {

    private static final Logger log = LoggerFactory.getLogger(ScanService.class);
    private static final long MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    private static final int MAX_CONCURRENT_JOBS_PER_TENANT = 5;
    private static final byte[] PDF_MAGIC = {0x25, 0x50, 0x44, 0x46}; // %PDF

    private final S3StorageService s3Service;
    private final JdbcTemplate jdbcTemplate;

    public ScanService(S3StorageService s3Service, JdbcTemplate jdbcTemplate) {
        this.s3Service = s3Service;
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional
    public ScanJobResponse submitScanJob(UUID tenantId, MultipartFile file, String declarationType) {
        // Validate file size
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("File size exceeds 10MB limit");
        }

        // Validate PDF header (magic bytes)
        try {
            byte[] header = new byte[4];
            file.getInputStream().read(header);
            if (header[0] != PDF_MAGIC[0] || header[1] != PDF_MAGIC[1]
                    || header[2] != PDF_MAGIC[2] || header[3] != PDF_MAGIC[3]) {
                throw new IllegalArgumentException("Invalid file: not a PDF document");
            }
        } catch (IOException e) {
            throw new IllegalArgumentException("Cannot read uploaded file");
        }

        // Rate limit: max concurrent active jobs per tenant
        Integer activeJobs = jdbcTemplate.queryForObject("""
            SELECT COUNT(*) FROM ai_jobs
            WHERE tenant_id = ?::uuid
              AND status IN ('CREATED', 'PROCESSING')
              AND model_type = 'customsguard-scan'
            """, Integer.class, tenantId.toString());

        if (activeJobs != null && activeJobs >= MAX_CONCURRENT_JOBS_PER_TENANT) {
            throw new IllegalStateException(
                    "Too many active scan jobs (" + activeJobs + "/" + MAX_CONCURRENT_JOBS_PER_TENANT
                    + "). Please wait for existing scans to complete.");
        }

        try {
            UUID jobId = UUIDv7.generate();
            String s3Key = "customsguard/scans/" + tenantId + "/" + jobId + ".pdf";

            // 1. Upload PDF to S3
            s3Service.uploadPdf(file.getBytes(), s3Key);

            // 2. Create ai_job record
            jdbcTemplate.update("""
                INSERT INTO ai_jobs (id, tenant_id, status, progress, model_type, prompt, created_at, updated_at)
                VALUES (?::uuid, ?::uuid, 'CREATED', 0, 'customsguard-scan', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """, jobId.toString(), tenantId.toString(), s3Key);

            // 3. Create cg_declarations record
            UUID declId = UUIDv7.generate();
            jdbcTemplate.update("""
                INSERT INTO cg_declarations (id, tenant_id, declaration_type, status, ai_job_id, created_at, updated_at)
                VALUES (?::uuid, ?::uuid, ?, 'PROCESSING', ?::uuid, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """, declId.toString(), tenantId.toString(), declarationType, jobId.toString());

            // 4. Insert outbox_event for n8n worker
            UUID eventId = UUIDv7.generate();
            String payload = String.format(
                    "{\"jobId\":\"%s\",\"s3Key\":\"%s\",\"tenantId\":\"%s\",\"declarationType\":\"%s\"}",
                    jobId, s3Key, tenantId, declarationType);
            jdbcTemplate.update("""
                INSERT INTO outbox_events (id, tenant_id, event_type, payload, created_at)
                VALUES (?::uuid, ?::uuid, 'CUSTOMSGUARD_SCAN', ?::jsonb, CURRENT_TIMESTAMP)
                """, eventId.toString(), tenantId.toString(), payload);

            log.info("Scan job submitted: jobId={}, s3Key={}", jobId, s3Key);

            return new ScanJobResponse(jobId, "CREATED", (short) 0, s3Key);

        } catch (IOException e) {
            throw new RuntimeException("Failed to read uploaded file", e);
        }
    }

    @Transactional(readOnly = true)
    public ScanJobResponse getJobStatus(UUID tenantId, UUID jobId) {
        return jdbcTemplate.queryForObject("""
            SELECT j.id, j.status, j.progress, j.prompt
            FROM ai_jobs j
            WHERE j.id = ?::uuid AND j.tenant_id = ?::uuid
            """,
                (rs, rowNum) -> new ScanJobResponse(
                        UUID.fromString(rs.getString("id")),
                        rs.getString("status"),
                        rs.getShort("progress"),
                        rs.getString("prompt")),
                jobId.toString(), tenantId.toString());
    }
}
