package com.vollos.feature.customsguard.controller;

import com.vollos.core.feature.RequiresFeature;
import com.vollos.feature.customsguard.dto.TaxCalculationRequest;
import com.vollos.feature.customsguard.dto.TaxCalculationResponse;
import com.vollos.feature.customsguard.service.TaxCalculationService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/v1/customsguard/tax")
@RequiresFeature("customsguard")
public class TaxCalculationController {

    private final TaxCalculationService taxService;

    public TaxCalculationController(TaxCalculationService taxService) {
        this.taxService = taxService;
    }

    @PostMapping("/calculate")
    public TaxCalculationResponse calculate(@Valid @RequestBody TaxCalculationRequest request) {
        return taxService.calculateFull(request.cifAmount(), request.dutyRatePercent(),
                request.hsCode(), request.quantity());
    }
}
