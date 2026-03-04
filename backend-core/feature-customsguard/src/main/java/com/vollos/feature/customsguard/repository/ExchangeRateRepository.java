package com.vollos.feature.customsguard.repository;

import com.vollos.feature.customsguard.entity.ExchangeRateEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ExchangeRateRepository extends JpaRepository<ExchangeRateEntity, UUID> {

    @Query("""
        SELECT e FROM ExchangeRateEntity e
        WHERE e.effectiveDate = (SELECT MAX(e2.effectiveDate) FROM ExchangeRateEntity e2)
        ORDER BY e.currencyCode
        """)
    List<ExchangeRateEntity> findLatestRates();

    @Query("""
        SELECT e FROM ExchangeRateEntity e
        WHERE e.currencyCode = :currency
        ORDER BY e.effectiveDate DESC
        LIMIT 1
        """)
    Optional<ExchangeRateEntity> findLatestByCurrency(@Param("currency") String currency);
}
