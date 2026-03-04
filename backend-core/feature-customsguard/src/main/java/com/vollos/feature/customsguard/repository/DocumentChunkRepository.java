package com.vollos.feature.customsguard.repository;

import com.vollos.feature.customsguard.entity.DocumentChunkEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
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

    @Modifying
    @Query(value = """
        INSERT INTO cg_document_chunks
        (id, source_type, source_id, chunk_index, chunk_text, content_summary, embedding, metadata, created_at, updated_at)
        VALUES (gen_random_uuid(), :sourceType, :sourceId, :chunkIndex, :chunkText, :summary,
                cast(:embedding AS vector), cast(:metadata AS jsonb), NOW(), NOW())
        """, nativeQuery = true)
    void insertChunkWithEmbedding(@Param("sourceType") String sourceType,
                                   @Param("sourceId") String sourceId,
                                   @Param("chunkIndex") int chunkIndex,
                                   @Param("chunkText") String chunkText,
                                   @Param("summary") String summary,
                                   @Param("embedding") String embedding,
                                   @Param("metadata") String metadata);
}
