package com.vollos.feature.customsguard.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vollos.feature.customsguard.dto.RagChunkDto;
import com.vollos.feature.customsguard.dto.RagSearchResponse;
import com.vollos.feature.customsguard.repository.DocumentChunkRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.stream.Collectors;

@Service
public class RagService {

    private static final Logger log = LoggerFactory.getLogger(RagService.class);

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {};

    private final GeminiEmbeddingService embeddingService;
    private final DocumentChunkRepository chunkRepo;
    private final GeminiChatService chatService;
    private final ExecutorService sseExecutor = Executors.newVirtualThreadPerTaskExecutor();

    public RagService(GeminiEmbeddingService embeddingService,
                      DocumentChunkRepository chunkRepo,
                      GeminiChatService chatService) {
        this.embeddingService = embeddingService;
        this.chunkRepo = chunkRepo;
        this.chatService = chatService;
    }

    private Map<String, Object> parseMetadata(Object raw) {
        if (raw == null) return Collections.emptyMap();
        try {
            String json = raw.toString();
            return MAPPER.readValue(json, MAP_TYPE);
        } catch (Exception e) {
            log.warn("Failed to parse metadata JSONB: {}", e.getMessage());
            return Collections.emptyMap();
        }
    }

    private RagChunkDto toChunkDto(Object[] row) {
        var meta = parseMetadata(row[6]);
        return new RagChunkDto(
                (String) row[1],   // source_type
                (String) row[2],   // source_id
                (String) row[4],   // chunk_text
                (String) row[5],   // content_summary
                row[7] != null ? ((Number) row[7]).doubleValue() : null,  // similarity
                (String) meta.get("source_url"),
                (String) meta.get("doc_number"),
                (String) meta.get("doc_type"),
                (String) meta.get("title"));
    }

    @Transactional(readOnly = true)
    public RagSearchResponse search(String query, int limit) {
        long start = System.currentTimeMillis();

        // 1. Embed the query
        float[] queryEmb = embeddingService.embed(query);
        String embStr = GeminiEmbeddingService.toVectorString(queryEmb);

        // 2. Retrieve top-K chunks from cg_document_chunks
        List<Object[]> chunks = chunkRepo.findBySemantic(embStr, limit * 2);

        if (chunks.isEmpty()) {
            return new RagSearchResponse(
                    "ไม่พบข้อมูลที่เกี่ยวข้องในฐานข้อมูล",
                    List.of(),
                    System.currentTimeMillis() - start);
        }

        // 3. Build RAG context from chunks
        String context = chunks.stream()
                .limit(limit)
                .map(row -> (String) row[4])  // chunk_text
                .collect(Collectors.joining("\n---\n"));

        // 4. Call Gemini chat with context + query
        String answer = chatService.generateAnswer(query, context);

        // 5. Map chunks to DTOs
        List<RagChunkDto> sources = chunks.stream()
                .limit(limit)
                .map(this::toChunkDto)
                .toList();

        long elapsed = System.currentTimeMillis() - start;
        log.info("RAG search completed in {}ms, {} sources", elapsed, sources.size());

        return new RagSearchResponse(answer, sources, elapsed);
    }

    /**
     * SSE streaming version: sends sources first, then answer, then done.
     * Runs on virtual thread to avoid blocking servlet thread.
     */
    public void streamSearch(String query, int limit, SseEmitter emitter) {
        sseExecutor.execute(() -> {
            try {
                // 1. Emit: searching
                emitter.send(SseEmitter.event().name("status").data("embedding_query"));

                float[] queryEmb = embeddingService.embed(query);
                String embStr = GeminiEmbeddingService.toVectorString(queryEmb);

                // 2. Emit: retrieving
                emitter.send(SseEmitter.event().name("status").data("retrieving_chunks"));

                List<Object[]> chunks = chunkRepo.findBySemantic(embStr, limit * 2);

                if (chunks.isEmpty()) {
                    emitter.send(SseEmitter.event().name("done")
                            .data(Map.of("answer", "ไม่พบข้อมูลที่เกี่ยวข้องในฐานข้อมูล", "sources", List.of())));
                    emitter.complete();
                    return;
                }

                // 3. Emit: sources (so UI can show them immediately)
                List<RagChunkDto> sources = chunks.stream()
                        .limit(limit)
                        .map(this::toChunkDto)
                        .toList();

                emitter.send(SseEmitter.event().name("sources").data(sources));

                // 4. Emit: generating answer
                emitter.send(SseEmitter.event().name("status").data("generating_answer"));

                String context = chunks.stream()
                        .limit(limit)
                        .map(row -> (String) row[4])
                        .collect(Collectors.joining("\n---\n"));

                String answer = chatService.generateAnswer(query, context);

                // 5. Emit: complete answer
                emitter.send(SseEmitter.event().name("done")
                        .data(Map.of("answer", answer, "sources", sources)));

                emitter.complete();

            } catch (IOException e) {
                log.warn("SSE connection closed by client");
            } catch (Exception e) {
                log.error("SSE stream error", e);
                try {
                    emitter.send(SseEmitter.event().name("error").data(e.getMessage()));
                    emitter.complete();
                } catch (IOException ignored) {}
            }
        });
    }
}
