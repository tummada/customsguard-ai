package com.vollos.feature.customsguard.service;

import com.vollos.feature.customsguard.entity.RegulationEntity;
import com.vollos.feature.customsguard.repository.DocumentChunkRepository;
import com.vollos.feature.customsguard.repository.RegulationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class DocumentChunkService {

    private static final Logger log = LoggerFactory.getLogger(DocumentChunkService.class);

    private static final int CHUNK_SIZE = 1500;
    private static final int OVERLAP = 200;

    private final RegulationRepository regulationRepo;
    private final DocumentChunkRepository chunkRepo;
    private final GeminiEmbeddingService embeddingService;
    private final ObjectMapper objectMapper;

    public DocumentChunkService(RegulationRepository regulationRepo,
                                DocumentChunkRepository chunkRepo,
                                GeminiEmbeddingService embeddingService,
                                ObjectMapper objectMapper) {
        this.regulationRepo = regulationRepo;
        this.chunkRepo = chunkRepo;
        this.embeddingService = embeddingService;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public Map<String, Integer> chunkAndEmbedAll() {
        List<RegulationEntity> regulations = regulationRepo.findAll();
        int chunked = 0;
        int embedded = 0;
        int failed = 0;

        // Pre-fetch all regulation IDs that already have chunks to avoid N+1 queries
        java.util.Set<String> alreadyChunked = new java.util.HashSet<>(
                chunkRepo.findSourceIdsBySourceType("REGULATION"));

        for (RegulationEntity reg : regulations) {
            String sourceId = reg.getId().toString();

            // Skip if already chunked (unless regulation was updated after last chunk)
            if (alreadyChunked.contains(sourceId)) {
                if (reg.getUpdatedAt() == null || !isChunkStale(sourceId, reg.getUpdatedAt())) {
                    log.info("Skipping regulation '{}' — already chunked", reg.getTitle());
                    continue;
                }
                log.info("Re-embedding regulation '{}' — content updated since last chunk", reg.getTitle());
                chunkRepo.deleteBySourceTypeAndSourceId("REGULATION", sourceId);
            }

            List<String> chunks = chunkText(reg.getContent());
            String contextPrefix = reg.getDocType() + " — " + reg.getTitle() + "\n";

            for (int i = 0; i < chunks.size(); i++) {
                try {
                    String chunkText = chunks.get(i);
                    String embeddingInput = contextPrefix + chunkText;
                    float[] embedding = embeddingService.embed(embeddingInput);
                    String vectorStr = GeminiEmbeddingService.toVectorString(embedding);

                    String summary = reg.getTitle() + " (ข้อที่ " + (i + 1) + "/" + chunks.size() + ")";
                    String metadata = buildMetadata(reg, i);

                    chunkRepo.insertChunkWithEmbedding(
                            "REGULATION", sourceId, i, chunkText, summary, vectorStr, metadata);

                    embedded++;
                    chunked++;

                    if (embedded % 5 == 0) {
                        log.info("Embedded {}/{} chunks so far", embedded, countTotalChunks(regulations, chunks.size()));
                        Thread.sleep(300);
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    log.warn("Embedding interrupted at chunk {}", i);
                    return Map.of("chunked", chunked, "embedded", embedded);
                } catch (Exception e) {
                    failed++;
                    log.error("Failed to embed chunk {} of '{}': {}", i, reg.getTitle(), e.getMessage());
                }
            }

            log.info("Completed regulation '{}': {} chunks", reg.getTitle(), chunks.size());
        }

        if (failed > 0) {
            log.error("ALERT: Chunk & embed completed with {} failures out of {} total — " +
                    "some chunks missing from RAG search. Re-run to retry failed chunks.", failed, chunked + failed);
        }
        log.info("Chunk & embed complete: chunked={}, embedded={}, failed={}", chunked, embedded, failed);
        return Map.of("chunked", chunked, "embedded", embedded, "failed", failed);
    }

    /**
     * Split text into chunks at sentence boundaries with overlap.
     */
    List<String> chunkText(String text) {
        if (text == null || text.isBlank()) {
            return List.of();
        }

        if (text.length() <= CHUNK_SIZE) {
            return List.of(text.trim());
        }

        List<String> chunks = new ArrayList<>();
        int start = 0;

        while (start < text.length()) {
            int end = Math.min(start + CHUNK_SIZE, text.length());

            // Try to break at sentence boundary
            if (end < text.length()) {
                int breakPoint = findSentenceBreak(text, start, end);
                if (breakPoint > start) {
                    end = breakPoint;
                }
            }

            chunks.add(text.substring(start, end).trim());

            // Next chunk starts with overlap (back up OVERLAP chars from end)
            int nextStart = end - OVERLAP;
            if (nextStart <= start) {
                // Prevent infinite loop — force advance past current chunk
                nextStart = end;
            }
            start = nextStart;
        }

        return chunks;
    }

    private int findSentenceBreak(String text, int start, int end) {
        // H4: Thai text has no spaces between words — prioritize newline/paragraph breaks
        // Priority 1: Double newline (paragraph break)
        for (int i = end; i > start + CHUNK_SIZE / 2; i--) {
            if (i > 1 && text.charAt(i - 1) == '\n' && text.charAt(i - 2) == '\n') {
                return i;
            }
        }
        // Priority 2: Single newline
        for (int i = end; i > start + CHUNK_SIZE / 2; i--) {
            if (text.charAt(i - 1) == '\n') {
                return i;
            }
        }
        // Priority 3: Thai sentence-ending characters (Thai period ๆ, fullstop, CJK period)
        for (int i = end; i > start + CHUNK_SIZE / 2; i--) {
            char c = text.charAt(i - 1);
            if (c == '.' || c == '。' || c == '\u0E2F' /* ฯ Thai abbreviation */
                    || (c == ' ' && i > 1 && text.charAt(i - 2) == '.')) {
                return i;
            }
        }
        // Priority 4: Tab or multiple spaces (common in Thai legal documents)
        for (int i = end; i > start + CHUNK_SIZE / 2; i--) {
            char c = text.charAt(i - 1);
            if (c == '\t' || (c == ' ' && i > 1 && text.charAt(i - 2) == ' ')) {
                return i;
            }
        }
        return end;
    }

    private String buildMetadata(RegulationEntity reg, int sectionNumber) {
        try {
            ObjectNode node = objectMapper.createObjectNode();
            node.put("doc_type", reg.getDocType());
            node.put("title", reg.getTitle());
            if (reg.getDocNumber() != null) node.put("doc_number", reg.getDocNumber());
            if (reg.getIssuer() != null) node.put("issuer", reg.getIssuer());
            if (reg.getSourceUrl() != null) node.put("source_url", reg.getSourceUrl());
            node.put("section_number", sectionNumber + 1);
            return objectMapper.writeValueAsString(node);
        } catch (Exception e) {
            log.warn("Failed to build metadata JSON: {}", e.getMessage());
            return "{}";
        }
    }

    private boolean isChunkStale(String sourceId, java.time.Instant regulationUpdatedAt) {
        try {
            java.time.LocalDateTime lastChunked = chunkRepo.findLatestCreatedAtBySourceId(sourceId);
            if (lastChunked == null) return true;
            java.time.Instant lastChunkedInstant = lastChunked.atZone(java.time.ZoneOffset.UTC).toInstant();
            return regulationUpdatedAt.isAfter(lastChunkedInstant);
        } catch (Exception e) {
            log.warn("Failed to check chunk staleness for {}: {}", sourceId, e.getMessage());
            return false;
        }
    }

    private int countTotalChunks(List<RegulationEntity> regulations, int currentChunkSize) {
        // Rough estimate
        return regulations.size() * currentChunkSize;
    }
}
