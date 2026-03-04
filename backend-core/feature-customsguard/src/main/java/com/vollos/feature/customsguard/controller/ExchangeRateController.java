package com.vollos.feature.customsguard.controller;

import com.vollos.core.feature.RequiresFeature;
import com.vollos.feature.customsguard.dto.ExchangeRateDto;
import com.vollos.feature.customsguard.service.ExchangeRateService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/customsguard/exchange-rates")
@RequiresFeature("customsguard")
public class ExchangeRateController {

    private final ExchangeRateService exchangeRateService;

    public ExchangeRateController(ExchangeRateService exchangeRateService) {
        this.exchangeRateService = exchangeRateService;
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
}
