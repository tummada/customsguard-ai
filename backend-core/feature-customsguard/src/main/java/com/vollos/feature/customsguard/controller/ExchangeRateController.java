package com.vollos.feature.customsguard.controller;

import com.vollos.core.feature.RequiresFeature;
import com.vollos.feature.customsguard.dto.ExchangeRateDto;
import com.vollos.feature.customsguard.service.ExchangeRateService;
import com.vollos.feature.customsguard.service.ExchangeRateSyncService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/customsguard/exchange-rates")
@RequiresFeature("customsguard")
public class ExchangeRateController {

    private final ExchangeRateService exchangeRateService;
    private final ExchangeRateSyncService exchangeRateSyncService;
    private final String adminSecret;

    public ExchangeRateController(ExchangeRateService exchangeRateService,
                                  ExchangeRateSyncService exchangeRateSyncService,
                                  @Value("${admin.secret}") String adminSecret) {
        this.exchangeRateService = exchangeRateService;
        this.exchangeRateSyncService = exchangeRateSyncService;
        this.adminSecret = adminSecret;
    }

    @GetMapping
    public List<ExchangeRateDto> getLatestRates() {
        return exchangeRateService.getLatestRates();
    }

    @GetMapping("/{currency}")
    public ResponseEntity<ExchangeRateDto> getByCurrency(@PathVariable String currency) {
        return exchangeRateService.getLatestByCurrency(currency)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /** Manual trigger to sync rates from customs.go.th (admin use) */
    @PostMapping("/sync")
    public ResponseEntity<Map<String, Object>> syncRates(
            @RequestHeader(value = "X-Admin-Secret", required = false) String secret) {
        if (secret == null || !MessageDigest.isEqual(
                secret.getBytes(StandardCharsets.UTF_8),
                adminSecret.getBytes(StandardCharsets.UTF_8))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Invalid admin secret"));
        }
        int count = exchangeRateSyncService.syncFromCustomsDept();
        return ResponseEntity.ok(Map.of(
                "synced", count,
                "source", "customs.go.th"
        ));
    }
}
