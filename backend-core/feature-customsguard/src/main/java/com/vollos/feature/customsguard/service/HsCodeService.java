package com.vollos.feature.customsguard.service;

import com.vollos.feature.customsguard.dto.HsCodeResponse;
import com.vollos.feature.customsguard.repository.HsCodeRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class HsCodeService {

    private final HsCodeRepository hsCodeRepo;

    public HsCodeService(HsCodeRepository hsCodeRepo) {
        this.hsCodeRepo = hsCodeRepo;
    }

    @Transactional(readOnly = true)
    public Page<HsCodeResponse> search(UUID tenantId, String query, Pageable pageable) {
        return hsCodeRepo.search(tenantId, query, pageable)
                .map(e -> new HsCodeResponse(
                        e.getId(),
                        e.getCode(),
                        e.getDescriptionTh(),
                        e.getDescriptionEn(),
                        e.getDutyRate(),
                        e.getCategory(),
                        e.getAiConfidence()
                ));
    }
}
