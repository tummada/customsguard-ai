package com.vollos.feature.customsguard.service;

import com.vollos.feature.customsguard.dto.ExchangeRateDto;
import com.vollos.feature.customsguard.entity.ExchangeRateEntity;
import com.vollos.feature.customsguard.repository.ExchangeRateRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class ExchangeRateService {

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

    private ExchangeRateDto toDto(ExchangeRateEntity e) {
        return new ExchangeRateDto(
                e.getCurrencyCode(),
                e.getCurrencyName(),
                e.getMidRate(),
                e.getEffectiveDate(),
                e.getSource()
        );
    }
}
