package com.vollos.feature.customsguard.controller;

import com.vollos.core.feature.RequiresFeature;
import com.vollos.feature.customsguard.dto.HsCodeResponse;
import com.vollos.feature.customsguard.dto.SemanticSearchRequest;
import com.vollos.feature.customsguard.dto.SemanticSearchResponse;
import com.vollos.feature.customsguard.service.HsCodeService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/v1/customsguard/hs-codes")
@RequiresFeature("customsguard")
@Validated
public class HsCodeController {

    private final HsCodeService hsCodeService;

    public HsCodeController(HsCodeService hsCodeService) {
        this.hsCodeService = hsCodeService;
    }

    @GetMapping
    public Page<HsCodeResponse> search(
            @RequestParam @NotBlank(message = "Search query must not be blank")
            @Size(max = 500, message = "Search query must not exceed 500 characters") String query,
            Pageable pageable) {
        return hsCodeService.search(query, pageable);
    }

    @PostMapping("/semantic")
    public List<SemanticSearchResponse> semanticSearch(
            @Valid @RequestBody SemanticSearchRequest request) {
        return hsCodeService.semanticSearch(request.query(), request.limit());
    }

    @PostMapping("/embed-all")
    public Map<String, Object> embedAll() {
        int count = hsCodeService.embedAllHsCodes();
        return Map.of("embedded", count);
    }

    @PostMapping("/seed")
    public Map<String, Object> seed() {
        int count = hsCodeService.seedSampleHsCodes();
        return Map.of("seeded", count);
    }
}
