package com.vollos.feature.customsguard.repository;

import com.vollos.feature.customsguard.entity.FtaRateEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface FtaRateRepository extends JpaRepository<FtaRateEntity, UUID> {

    @Query("""
        SELECT f FROM FtaRateEntity f
        WHERE f.hsCode = :hsCode
          AND (f.effectiveTo IS NULL OR f.effectiveTo >= CURRENT_DATE)
        """)
    List<FtaRateEntity> findActiveByHsCode(@Param("hsCode") String hsCode);

    @Query("""
        SELECT f FROM FtaRateEntity f
        WHERE f.hsCode = :hsCode
          AND f.partnerCountry = :country
          AND (f.effectiveTo IS NULL OR f.effectiveTo >= CURRENT_DATE)
        """)
    List<FtaRateEntity> findActiveByHsCodeAndCountry(
            @Param("hsCode") String hsCode,
            @Param("country") String country);
}
