package com.vollos.feature.customsguard.repository;

import com.vollos.feature.customsguard.entity.HsCodeEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface HsCodeRepository extends JpaRepository<HsCodeEntity, UUID> {

    @Query("""
        SELECT h FROM HsCodeEntity h
        WHERE h.tenantId = :tenantId
        AND (LOWER(h.code) LIKE LOWER(CONCAT('%', :query, '%'))
             OR LOWER(h.descriptionTh) LIKE LOWER(CONCAT('%', :query, '%'))
             OR LOWER(h.descriptionEn) LIKE LOWER(CONCAT('%', :query, '%')))
        """)
    Page<HsCodeEntity> search(@Param("tenantId") UUID tenantId,
                               @Param("query") String query,
                               Pageable pageable);
}
