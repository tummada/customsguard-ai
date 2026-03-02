package com.vollos.feature.customsguard.repository;

import com.vollos.feature.customsguard.entity.HsCodeEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
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

    @Query(value = """
        SELECT h.id, h.code, h.description_th, h.description_en,
               h.duty_rate, h.category, h.ai_confidence,
               1 - (h.embedding <=> cast(:embedding AS vector)) AS similarity
        FROM cg_hs_codes h
        WHERE h.tenant_id = cast(:tenantId AS uuid)
          AND h.embedding IS NOT NULL
        ORDER BY h.embedding <=> cast(:embedding AS vector)
        LIMIT :limit
        """, nativeQuery = true)
    List<Object[]> findBySemantic(@Param("tenantId") UUID tenantId,
                                  @Param("embedding") String embedding,
                                  @Param("limit") int limit);

    @Modifying
    @Query(value = """
        UPDATE cg_hs_codes
        SET embedding = cast(:embedding AS vector), embedded = true
        WHERE id = cast(:id AS uuid)
        """, nativeQuery = true)
    void updateEmbedding(@Param("id") UUID id, @Param("embedding") String embedding);

    List<HsCodeEntity> findByTenantIdAndEmbeddedFalse(UUID tenantId);
}
