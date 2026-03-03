package com.vollos.feature.customsguard.controller;

import com.vollos.core.feature.RequiresFeature;
import com.vollos.core.tenant.TenantContext;
import com.vollos.feature.customsguard.dto.ScanJobResponse;
import com.vollos.feature.customsguard.service.ScanService;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/v1/customsguard/scan")
@RequiresFeature("customsguard")
public class ScanController {

    private final ScanService scanService;

    public ScanController(ScanService scanService) {
        this.scanService = scanService;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadPdf(
            @RequestParam("file") MultipartFile file,
            @RequestParam(defaultValue = "IMPORT") String declarationType) {
        UUID tenantId = TenantContext.getCurrentTenantId();

        try {
            ScanJobResponse job = scanService.submitScanJob(tenantId, file, declarationType);
            return ResponseEntity.accepted().body(job);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (IllegalStateException e) {
            // Rate limit exceeded
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{jobId}")
    public ResponseEntity<ScanJobResponse> getJobStatus(@PathVariable UUID jobId) {
        ScanJobResponse job = scanService.getJobStatus(TenantContext.getCurrentTenantId(), jobId);
        if (job == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(job);
    }
}
