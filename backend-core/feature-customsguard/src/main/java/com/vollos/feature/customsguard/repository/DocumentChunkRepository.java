package com.vollos.feature.customsguard.repository;

import com.vollos.feature.customsguard.entity.DocumentChunkEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface DocumentChunkRepository extends JpaRepository<DocumentChunkEntity, UUID> {

    @Query(value = """
        SELECT dc.id, dc.source_type, dc.source_id, dc.chunk_index,
               dc.chunk_text, dc.content_summary, dc.metadata,
               1 - (dc.embedding <=> cast(:embedding AS vector)) AS similarity
        FROM cg_document_chunks dc
        WHERE dc.embedding IS NOT NULL
        ORDER BY dc.embedding <=> cast(:embedding AS vector)
        LIMIT :limit
        """, nativeQuery = true)
    List<Object[]> findBySemantic(@Param("embedding") String embedding,
                                  @Param("limit") int limit);

    List<DocumentChunkEntity> findBySourceTypeAndSourceId(String sourceType, String sourceId);
}
