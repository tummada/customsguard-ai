package com.vollos.feature.customsguard.repository;

import com.vollos.feature.customsguard.entity.LpiControlEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface LpiControlRepository extends JpaRepository<LpiControlEntity, UUID> {

    /**
     * Reverse prefix match: find LPI controls where the seed HS code (4-6 digits)
     * is a prefix of the input code (8-10 digits).
     * Example: input '03061790' matches seed '030617' and '0306'.
     */
    @Query(value = """
        SELECT l.* FROM cg_lpi_controls l
        WHERE :inputCode LIKE CONCAT(l.hs_code, '%')
        ORDER BY LENGTH(l.hs_code) DESC
        """, nativeQuery = true)
    List<LpiControlEntity> findByHsCodePrefix(@Param("inputCode") String inputCode);
}
