package com.vollos.feature.customsguard.repository;

import com.vollos.feature.customsguard.entity.ExciseRateEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface ExciseRateRepository extends JpaRepository<ExciseRateEntity, UUID> {

    List<ExciseRateEntity> findByHsCode(String hsCode);

    @Query(value = """
        SELECT e.* FROM cg_excise_rates e
        WHERE :inputCode LIKE CONCAT(e.hs_code, '%')
        ORDER BY LENGTH(e.hs_code) DESC
        """, nativeQuery = true)
    List<ExciseRateEntity> findByHsCodePrefix(@Param("inputCode") String inputCode);
}
