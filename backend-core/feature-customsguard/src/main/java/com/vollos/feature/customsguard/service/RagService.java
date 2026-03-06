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

    /**
     * Tier 2 data topics that are not yet available.
     * When a query matches these keywords, a disclaimer is injected
     * instead of letting RAG hallucinate from unrelated chunks.
     */
    private static final Map<String, String> UNAVAILABLE_TOPICS = Map.of(
            "anti-dumping", "ข้อมูลอากรตอบโต้การทุ่มตลาด (Anti-Dumping) กำลังอยู่ในช่วงอัปเดต กรุณาตรวจสอบที่ กรมการค้าต่างประเทศ https://www.dft.go.th",
            "AD", "ข้อมูลอากรตอบโต้การทุ่มตลาด (Anti-Dumping) กำลังอยู่ในช่วงอัปเดต กรุณาตรวจสอบที่ กรมการค้าต่างประเทศ https://www.dft.go.th",
            "excise", "ข้อมูลภาษีสรรพสามิต กำลังอยู่ในช่วงอัปเดต กรุณาตรวจสอบที่ กรมสรรพสามิต https://www.excise.go.th",
            "BOI", "ข้อมูลสิทธิประโยชน์ BOI กำลังอยู่ในช่วงอัปเดต กรุณาตรวจสอบที่ สำนักงานคณะกรรมการส่งเสริมการลงทุน https://www.boi.go.th",
            "LPI", "ข้อมูลสินค้าควบคุมการนำเข้า (LPI) กำลังอยู่ในช่วงอัปเดต กรุณาตรวจสอบที่หน่วยงานที่เกี่ยวข้อง"
    );

    private static final List<String> UNAVAILABLE_KEYWORDS_TH = List.of(
            "ตอบโต้การทุ่มตลาด", "สรรพสามิต", "ส่งเสริมการลงทุน", "สินค้าควบคุม"
    );

    private static final double MIN_SIMILARITY_THRESHOLD = 0.65;
    private static final String NO_RELEVANT_DATA_MSG =
            "ยังไม่พบข้อมูลที่ตรงกับคำถามในฐานข้อมูลครับ " +
            "ลองระบุชื่อสินค้าให้ชัดเจนขึ้น เช่น \"พิกัดกุ้งแช่แข็ง\" หรือ \"อัตราอากรคอมพิวเตอร์\" " +
            "หรือตรวจสอบเพิ่มเติมที่ กรมศุลกากร https://www.customs.go.th";

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

    /**
     * Check if a query matches an unavailable Tier 2 topic.
     * Returns disclaimer message or null if topic is available.
     */
    private String checkUnavailableTopic(String query) {
        String q = query.toLowerCase();

        for (var entry : UNAVAILABLE_TOPICS.entrySet()) {
            if (q.contains(entry.getKey().toLowerCase())) {
                log.info("Query matched unavailable topic: {}", entry.getKey());
                return entry.getValue();
            }
        }

        for (String keyword : UNAVAILABLE_KEYWORDS_TH) {
            if (query.contains(keyword)) {
                log.info("Query matched unavailable Thai keyword: {}", keyword);
                return "ข้อมูลส่วนนี้กำลังอยู่ในช่วงอัปเดต โปรดตรวจสอบที่เว็บหน่วยงานโดยตรง";
            }
        }

        return null;
    }

    @Transactional(readOnly = true)
    public RagSearchResponse search(String query, int limit) {
        long start = System.currentTimeMillis();

        // 0. Check for unavailable Tier 2 topics
        String disclaimer = checkUnavailableTopic(query);
        if (disclaimer != null) {
            return new RagSearchResponse(disclaimer, List.of(),
                    System.currentTimeMillis() - start);
        }

        // 1. Embed the query
        float[] queryEmb = embeddingService.embed(query);
        String embStr = GeminiEmbeddingService.toVectorString(queryEmb);

        // 2. Retrieve top-K chunks from cg_document_chunks
        List<Object[]> chunks = chunkRepo.findBySemantic(embStr, limit * 2);

        // 3. Filter by similarity threshold
        double topScore = chunks.isEmpty() ? 0 : ((Number) chunks.get(0)[7]).doubleValue();
        List<Object[]> relevant = chunks.stream()
                .filter(row -> row[7] != null && ((Number) row[7]).doubleValue() >= MIN_SIMILARITY_THRESHOLD)
                .toList();

        log.info("Similarity filter: query='{}', total={}, passed={}, topScore={}",
                query, chunks.size(), relevant.size(), topScore);

        if (relevant.isEmpty()) {
            return new RagSearchResponse(
                    NO_RELEVANT_DATA_MSG,
                    List.of(),
                    System.currentTimeMillis() - start);
        }

        // 4. Build RAG context from relevant chunks
        String context = relevant.stream()
                .limit(limit)
                .map(row -> (String) row[4])  // chunk_text
                .collect(Collectors.joining("\n---\n"));

        // 5. Call Gemini chat with context + query
        String answer = chatService.generateAnswer(query, context);

        // 6. Map chunks to DTOs
        List<RagChunkDto> sources = relevant.stream()
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
                // 0. Check for unavailable Tier 2 topics
                String disclaimer = checkUnavailableTopic(query);
                if (disclaimer != null) {
                    emitter.send(SseEmitter.event().name("done")
                            .data(Map.of("answer", disclaimer, "sources", List.of())));
                    emitter.complete();
                    return;
                }

                // 1. Emit: searching
                emitter.send(SseEmitter.event().name("status").data("embedding_query"));

                float[] queryEmb = embeddingService.embed(query);
                String embStr = GeminiEmbeddingService.toVectorString(queryEmb);

                // 2. Emit: retrieving
                emitter.send(SseEmitter.event().name("status").data("retrieving_chunks"));

                List<Object[]> chunks = chunkRepo.findBySemantic(embStr, limit * 2);

                // 3. Filter by similarity threshold
                double topScore = chunks.isEmpty() ? 0 : ((Number) chunks.get(0)[7]).doubleValue();
                List<Object[]> relevant = chunks.stream()
                        .filter(row -> row[7] != null && ((Number) row[7]).doubleValue() >= MIN_SIMILARITY_THRESHOLD)
                        .toList();

                log.info("Similarity filter (stream): query='{}', total={}, passed={}, topScore={}",
                        query, chunks.size(), relevant.size(), topScore);

                if (relevant.isEmpty()) {
                    emitter.send(SseEmitter.event().name("done")
                            .data(Map.of("answer", NO_RELEVANT_DATA_MSG, "sources", List.of())));
                    emitter.complete();
                    return;
                }

                // 4. Emit: sources (so UI can show them immediately)
                List<RagChunkDto> sources = relevant.stream()
                        .limit(limit)
                        .map(this::toChunkDto)
                        .toList();

                emitter.send(SseEmitter.event().name("sources").data(sources));

                // 5. Emit: generating answer
                emitter.send(SseEmitter.event().name("status").data("generating_answer"));

                String context = relevant.stream()
                        .limit(limit)
                        .map(row -> (String) row[4])
                        .collect(Collectors.joining("\n---\n"));

                String answer = chatService.generateAnswer(query, context);

                // 6. Emit: complete answer
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
