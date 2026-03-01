package com.vollos.feature.customsguard.controller;

import com.vollos.core.feature.RequiresFeature;
import com.vollos.core.tenant.TenantContext;
import com.vollos.feature.customsguard.dto.HsCodeResponse;
import com.vollos.feature.customsguard.service.HsCodeService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/customsguard/hs-codes")
@RequiresFeature("customsguard")
public class HsCodeController {

    private final HsCodeService hsCodeService;

    public HsCodeController(HsCodeService hsCodeService) {
        this.hsCodeService = hsCodeService;
    }

    @GetMapping
    public Page<HsCodeResponse> search(@RequestParam String query, Pageable pageable) {
        return hsCodeService.search(TenantContext.getCurrentTenantId(), query, pageable);
    }
}
