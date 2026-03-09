package com.vollos.feature.customsguard.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vollos.feature.customsguard.dto.RagChunkDto;
import com.vollos.feature.customsguard.dto.RagSearchResponse;
import com.vollos.feature.customsguard.entity.FtaRateEntity;
import com.vollos.feature.customsguard.repository.DocumentChunkRepository;
import com.vollos.feature.customsguard.repository.FtaRateRepository;
import com.vollos.feature.customsguard.repository.HsCodeRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
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
            "อากร ad", "ข้อมูลอากรตอบโต้การทุ่มตลาด (Anti-Dumping) กำลังอยู่ในช่วงอัปเดต กรุณาตรวจสอบที่ กรมการค้าต่างประเทศ https://www.dft.go.th"
    );

    private static final List<String> UNAVAILABLE_KEYWORDS_TH = List.of(
            "ตอบโต้การทุ่มตลาด"
    );

    private static final double MIN_SIMILARITY_THRESHOLD = 0.65;
    private static final String NO_RELEVANT_DATA_MSG =
            "ยังไม่พบข้อมูลที่ตรงกับคำถามในฐานข้อมูลครับ " +
            "ลองระบุชื่อสินค้าให้ชัดเจนขึ้น เช่น \"พิกัดกุ้งแช่แข็ง\" หรือ \"อัตราอากรคอมพิวเตอร์\" " +
            "หรือตรวจสอบเพิ่มเติมที่ กรมศุลกากร https://www.customs.go.th";

    private static final int HS_CODE_CONTEXT_LIMIT = 8;
    private static final double HS_CODE_SIMILARITY_THRESHOLD = 0.55;
    // Matches HS code patterns: 0101, 0306.17, 0306.17.00, etc.
    private static final Pattern HS_CODE_IN_QUERY = Pattern.compile("\\b(\\d{4})(?:\\.\\d{2}(?:\\.\\d{2})?)?\\b");

    private final GeminiEmbeddingService embeddingService;
    private final DocumentChunkRepository chunkRepo;
    private final HsCodeRepository hsCodeRepo;
    private final FtaRateRepository ftaRateRepo;
    private final GeminiChatService chatService;
    private final ExecutorService sseExecutor = Executors.newVirtualThreadPerTaskExecutor();

    public RagService(GeminiEmbeddingService embeddingService,
                      DocumentChunkRepository chunkRepo,
                      HsCodeRepository hsCodeRepo,
                      FtaRateRepository ftaRateRepo,
                      GeminiChatService chatService) {
        this.embeddingService = embeddingService;
        this.chunkRepo = chunkRepo;
        this.hsCodeRepo = hsCodeRepo;
        this.ftaRateRepo = ftaRateRepo;
        this.chatService = chatService;
    }

    /**
     * Hybrid search cg_hs_codes (full-text + semantic RRF) and format as context text.
     * Also enriches each code with active FTA rates for comparison queries.
     */
    private String buildHsCodeContext(String query, String embStr) {
        List<Object[]> hsResults = hsCodeRepo.hybridSearch(query, embStr, HS_CODE_CONTEXT_LIMIT * 2);

        List<String> lines = new ArrayList<>();
        for (Object[] row : hsResults) {
            String code = (String) row[0];
            String descTh = row[1] != null ? (String) row[1] : "";
            String descEn = row[2] != null ? (String) row[2] : "";
            String rate = row[3] != null ? row[3].toString() + "%" : "N/A";
            String desc = !descTh.isEmpty() ? descTh : descEn;

            StringBuilder line = new StringBuilder(
                    "HS Code %s: %s (อัตราอากร MFN: %s)".formatted(code, desc, rate));

            // Enrich with FTA rates
            List<FtaRateEntity> ftaRates = ftaRateRepo.findActiveByHsCode(code);
            if (!ftaRates.isEmpty()) {
                String ftaInfo = ftaRates.stream()
                        .map(f -> "%s(%s): %s%%".formatted(f.getFtaName(), f.getPartnerCountry(), f.getPreferentialRate()))
                        .collect(Collectors.joining(", "));
                line.append(" | FTA: ").append(ftaInfo);
            }

            lines.add(line.toString());
            if (lines.size() >= HS_CODE_CONTEXT_LIMIT) break;
        }

        if (lines.isEmpty()) return null;
        log.info("HS code hybrid context: {} codes found", lines.size());
        return "=== ข้อมูลพิกัดศุลกากร (HS Code) ===\n" + String.join("\n", lines);
    }

    /**
     * When query mentions a specific HS code (e.g. "0101"), look up that heading + sub-codes.
     */
    private String buildCodePrefixContext(String query) {
        Matcher m = HS_CODE_IN_QUERY.matcher(query);
        if (!m.find()) return null;

        String fullMatch = m.group(0); // e.g. "0101" or "0306.17.00"
        String heading = m.group(1);   // 4-digit heading e.g. "0101"

        // Use the most specific code mentioned as prefix
        String prefix = fullMatch.replace(".", "").length() >= 4 ? fullMatch : heading;

        List<Object[]> results = hsCodeRepo.findByCodePrefix(prefix, 15);
        if (results.isEmpty()) return null;

        List<String> lines = new ArrayList<>();
        for (Object[] row : results) {
            String code = (String) row[0];
            String descTh = row[1] != null ? (String) row[1] : "";
            String descEn = row[2] != null ? (String) row[2] : "";
            String rate = row[3] != null ? row[3].toString() + "%" : "N/A";
            String desc = !descTh.isEmpty() ? descTh : descEn;
            lines.add("HS %s: %s (อัตราอากร: %s)".formatted(code, desc, rate));
        }

        log.info("Code prefix lookup: prefix='{}', found {} codes", prefix, lines.size());
        return "=== HS Code " + prefix + " และรหัสย่อย ===\n" + String.join("\n", lines);
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

        // 3.5 Hybrid search HS codes (full-text + semantic) for complementary context
        String hsContext = buildHsCodeContext(query, embStr);
        // 3.6 If query mentions a specific HS code, look up by prefix
        String prefixContext = buildCodePrefixContext(query);

        log.info("Similarity filter: query='{}', chunks={}/{}, topScore={}, hsContext={}, prefixContext={}",
                query, relevant.size(), chunks.size(), topScore, hsContext != null, prefixContext != null);

        if (relevant.isEmpty() && hsContext == null && prefixContext == null) {
            return new RagSearchResponse(
                    NO_RELEVANT_DATA_MSG,
                    List.of(),
                    System.currentTimeMillis() - start);
        }

        // 4. Build RAG context: prefix lookup > HS semantic > document chunks
        List<String> contextParts = new ArrayList<>();
        if (prefixContext != null) {
            contextParts.add(prefixContext);
        }
        if (hsContext != null) {
            contextParts.add(hsContext);
        }
        if (!relevant.isEmpty()) {
            String docContext = relevant.stream()
                    .limit(limit)
                    .map(row -> (String) row[4])  // chunk_text
                    .collect(Collectors.joining("\n---\n"));
            contextParts.add(docContext);
        }
        String context = String.join("\n\n", contextParts);

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

                // 3.5 Hybrid search HS codes
                String hsContext = buildHsCodeContext(query, embStr);
                String prefixContext = buildCodePrefixContext(query);

                log.info("Similarity filter (stream): query='{}', chunks={}/{}, topScore={}, hsContext={}, prefixContext={}",
                        query, relevant.size(), chunks.size(), topScore, hsContext != null, prefixContext != null);

                if (relevant.isEmpty() && hsContext == null && prefixContext == null) {
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

                List<String> contextParts = new ArrayList<>();
                if (prefixContext != null) {
                    contextParts.add(prefixContext);
                }
                if (hsContext != null) {
                    contextParts.add(hsContext);
                }
                if (!relevant.isEmpty()) {
                    String docContext = relevant.stream()
                            .limit(limit)
                            .map(row -> (String) row[4])
                            .collect(Collectors.joining("\n---\n"));
                    contextParts.add(docContext);
                }
                String context = String.join("\n\n", contextParts);

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
                } catch (IOException ex) {
                    log.warn("Failed to send SSE error event: {}", ex.getMessage());
                }
            }
        });
    }
}
