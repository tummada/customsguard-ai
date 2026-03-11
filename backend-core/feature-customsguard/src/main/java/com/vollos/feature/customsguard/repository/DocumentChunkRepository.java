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
        WHERE dc.tenant_id = CAST(:tenantId AS uuid)
          AND dc.embedding IS NOT NULL
        ORDER BY dc.embedding <=> cast(:embedding AS vector)
        LIMIT :limit
        """, nativeQuery = true)
    List<Object[]> findBySemantic(@Param("tenantId") String tenantId,
                                  @Param("embedding") String embedding,
                                  @Param("limit") int limit);

    List<DocumentChunkEntity> findBySourceTypeAndSourceId(String sourceType, String sourceId);

    @Query("SELECT DISTINCT dc.sourceId FROM DocumentChunkEntity dc WHERE dc.sourceType = :sourceType")
    List<String> findSourceIdsBySourceType(@Param("sourceType") String sourceType);

    @Modifying
    @Query("DELETE FROM DocumentChunkEntity dc WHERE dc.sourceType = :sourceType AND dc.sourceId = :sourceId")
    void deleteBySourceTypeAndSourceId(@Param("sourceType") String sourceType, @Param("sourceId") String sourceId);

    // v8-C3: Use Instant (timezone-aware) instead of LocalDateTime to avoid UTC/Bangkok mismatch
    @Query(value = "SELECT MAX(dc.created_at) FROM cg_document_chunks dc WHERE dc.source_id = :sourceId", nativeQuery = true)
    java.time.Instant findLatestCreatedAtBySourceId(@Param("sourceId") String sourceId);

    @Modifying
    @Query(value = """
        INSERT INTO cg_document_chunks
        (id, tenant_id, source_type, source_id, chunk_index, chunk_text, content_summary, embedding, metadata, created_at, updated_at)
        VALUES (cast(:id AS uuid), cast(:tenantId AS uuid), :sourceType, :sourceId, :chunkIndex, :chunkText, :summary,
                cast(:embedding AS vector), cast(:metadata AS jsonb), NOW(), NOW())
        """, nativeQuery = true)
    void insertChunkWithEmbedding(@Param("id") String id,
                                   @Param("tenantId") String tenantId,
                                   @Param("sourceType") String sourceType,
                                   @Param("sourceId") String sourceId,
                                   @Param("chunkIndex") int chunkIndex,
                                   @Param("chunkText") String chunkText,
                                   @Param("summary") String summary,
                                   @Param("embedding") String embedding,
                                   @Param("metadata") String metadata);
}
