package com.vollos.feature.customsguard.repository;

import com.vollos.feature.customsguard.entity.HsCodeEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface HsCodeRepository extends JpaRepository<HsCodeEntity, String> {

    @Query("""
        SELECT h FROM HsCodeEntity h
        WHERE LOWER(h.code) LIKE LOWER(CONCAT('%', :query, '%'))
           OR LOWER(h.descriptionTh) LIKE LOWER(CONCAT('%', :query, '%'))
           OR LOWER(h.descriptionEn) LIKE LOWER(CONCAT('%', :query, '%'))
        """)
    Page<HsCodeEntity> search(@Param("query") String query, Pageable pageable);

    @Query(value = """
        SELECT h.code, h.description_th, h.description_en,
               h.base_rate, h.category, h.unit,
               1 - (h.embedding <=> cast(:embedding AS vector)) AS similarity
        FROM cg_hs_codes h
        WHERE h.embedding IS NOT NULL
        ORDER BY h.embedding <=> cast(:embedding AS vector)
        LIMIT :limit
        """, nativeQuery = true)
    List<Object[]> findBySemantic(@Param("embedding") String embedding,
                                  @Param("limit") int limit);

    @Modifying
    @Query(value = """
        UPDATE cg_hs_codes
        SET embedding = cast(:embedding AS vector), embedded = true
        WHERE code = :code
        """, nativeQuery = true)
    void updateEmbedding(@Param("code") String code, @Param("embedding") String embedding);

    List<HsCodeEntity> findByEmbeddedFalse();

    @Query(value = """
        SELECT h.code, h.description_th, h.description_en, h.base_rate, h.category, h.unit
        FROM cg_hs_codes h
        WHERE h.code LIKE :prefix || '%'
        ORDER BY h.code
        LIMIT :limit
        """, nativeQuery = true)
    List<Object[]> findByCodePrefix(@Param("prefix") String prefix, @Param("limit") int limit);

    @Query(value = """
        SELECT h.code, h.description_th, h.description_en, h.base_rate, h.category, h.unit
        FROM cg_hs_codes h
        WHERE h.search_vector @@ plainto_tsquery('simple', :query)
        ORDER BY ts_rank(h.search_vector, plainto_tsquery('simple', :query)) DESC
        LIMIT :limit
        """, nativeQuery = true)
    List<Object[]> fullTextSearch(@Param("query") String query, @Param("limit") int limit);

    /**
     * Hybrid search: combines full-text (ts_rank) + vector similarity using RRF.
     * Reciprocal Rank Fusion merges both ranking signals for best-of-both accuracy.
     */
    @Query(value = """
        WITH fts AS (
            SELECT h.code,
                   ROW_NUMBER() OVER (ORDER BY ts_rank(h.search_vector, plainto_tsquery('simple', :query)) DESC) AS fts_rank
            FROM cg_hs_codes h
            WHERE h.search_vector @@ plainto_tsquery('simple', :query)
            LIMIT :limit
        ),
        sem AS (
            SELECT h.code,
                   ROW_NUMBER() OVER (ORDER BY h.embedding <=> cast(:embedding AS vector)) AS sem_rank
            FROM cg_hs_codes h
            WHERE h.embedding IS NOT NULL
            LIMIT :limit
        )
        SELECT COALESCE(s.code, f.code) AS code,
               h.description_th, h.description_en, h.base_rate, h.category, h.unit,
               (COALESCE(1.0 / (60 + f.fts_rank), 0) + COALESCE(1.0 / (60 + s.sem_rank), 0)) AS rrf_score
        FROM sem s
        FULL OUTER JOIN fts f ON s.code = f.code
        JOIN cg_hs_codes h ON h.code = COALESCE(s.code, f.code)
        ORDER BY rrf_score DESC
        LIMIT :limit
        """, nativeQuery = true)
    List<Object[]> hybridSearch(@Param("query") String query,
                                @Param("embedding") String embedding,
                                @Param("limit") int limit);
}
