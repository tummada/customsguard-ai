package com.vollos.feature.customsguard.controller;

import com.vollos.core.feature.RequiresFeature;
import com.vollos.feature.customsguard.dto.ExchangeRateDto;
import com.vollos.feature.customsguard.service.ExchangeRateService;
import com.vollos.feature.customsguard.service.ExchangeRateSyncService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/customsguard/exchange-rates")
@RequiresFeature("customsguard")
public class ExchangeRateController {

    private final ExchangeRateService exchangeRateService;
    private final ExchangeRateSyncService exchangeRateSyncService;

    public ExchangeRateController(ExchangeRateService exchangeRateService,
                                  ExchangeRateSyncService exchangeRateSyncService) {
        this.exchangeRateService = exchangeRateService;
        this.exchangeRateSyncService = exchangeRateSyncService;
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

    /** Manual trigger to sync rates from customs.go.th (admin only) */
    @PostMapping("/sync")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> syncRates() {
        int count = exchangeRateSyncService.syncFromCustomsDept();
        return ResponseEntity.ok(Map.of(
                "synced", count,
                "source", "customs.go.th"
        ));
    }

    /** Sync status for monitoring (admin only) */
    @GetMapping("/sync-status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> getSyncStatus() {
        return ResponseEntity.ok(exchangeRateSyncService.getSyncStatus());
    }
}
