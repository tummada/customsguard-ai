package com.vollos.feature.customsguard.repository;

import com.vollos.feature.customsguard.entity.AdDutyEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface AdDutyRepository extends JpaRepository<AdDutyEntity, UUID> {

    @Query(value = """
        SELECT d.* FROM cg_ad_duties d
        WHERE :inputCode LIKE CONCAT(d.hs_code, '%')
          AND (d.effective_to IS NULL OR d.effective_to >= CURRENT_DATE)
        ORDER BY LENGTH(d.hs_code) DESC
        """, nativeQuery = true)
    List<AdDutyEntity> findActiveByHsCodePrefix(@Param("inputCode") String inputCode);
}
