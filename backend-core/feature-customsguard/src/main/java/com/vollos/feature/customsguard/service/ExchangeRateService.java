package com.vollos.feature.customsguard.service;

import com.vollos.feature.customsguard.dto.ExchangeRateDto;
import com.vollos.feature.customsguard.entity.ExchangeRateEntity;
import com.vollos.feature.customsguard.repository.ExchangeRateRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Service
public class ExchangeRateService {

    private static final Logger log = LoggerFactory.getLogger(ExchangeRateService.class);

    private final ExchangeRateRepository exchangeRateRepo;

    public ExchangeRateService(ExchangeRateRepository exchangeRateRepo) {
        this.exchangeRateRepo = exchangeRateRepo;
    }

    @Transactional(readOnly = true)
    public List<ExchangeRateDto> getLatestRates() {
        return exchangeRateRepo.findLatestRates().stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public Optional<ExchangeRateDto> getLatestByCurrency(String currency) {
        return exchangeRateRepo.findLatestByCurrency(currency.toUpperCase())
                .map(this::toDto);
    }

    /**
     * C2: ดึง rate ตาม declarationType
     * EXPORT → exportRate, IMPORT/TRANSIT/TRANSSHIPMENT → midRate
     * ถ้า exportRate เป็น null → fallback midRate + log warning
     */
    @Transactional(readOnly = true)
    public Optional<BigDecimal> getRateForDeclaration(String currency, String declarationType) {
        return exchangeRateRepo.findLatestByCurrency(currency.toUpperCase())
                .map(e -> {
                    if ("EXPORT".equalsIgnoreCase(declarationType)) {
                        if (e.getExportRate() != null) {
                            return e.getExportRate();
                        }
                        log.warn("C2: exportRate is null for currency {} — fallback to midRate", currency);
                    }
                    return e.getMidRate();
                });
    }

    private ExchangeRateDto toDto(ExchangeRateEntity e) {
        return new ExchangeRateDto(
                e.getCurrencyCode(),
                e.getCurrencyName(),
                e.getMidRate(),
                e.getExportRate(),
                e.getEffectiveDate(),
                e.getSource()
        );
    }
}
