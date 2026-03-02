package com.vollos.feature.customsguard.controller;

import com.vollos.core.feature.RequiresFeature;
import com.vollos.feature.customsguard.dto.HsLookupRequest;
import com.vollos.feature.customsguard.dto.HsLookupResponse;
import com.vollos.feature.customsguard.service.HsLookupService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/v1/customsguard/hs")
@RequiresFeature("customsguard")
public class HsLookupController {

    private final HsLookupService hsLookupService;

    public HsLookupController(HsLookupService hsLookupService) {
        this.hsLookupService = hsLookupService;
    }

    @PostMapping("/lookup")
    public List<HsLookupResponse> batchLookup(@Valid @RequestBody HsLookupRequest request) {
        return hsLookupService.batchLookup(request.codes(), request.originCountry());
    }
}
