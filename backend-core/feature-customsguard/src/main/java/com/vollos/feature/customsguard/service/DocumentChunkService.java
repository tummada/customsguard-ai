package com.vollos.feature.customsguard.service;

import com.vollos.core.tenant.TenantContext;
import com.vollos.feature.customsguard.entity.RegulationEntity;
import com.vollos.feature.customsguard.repository.DocumentChunkRepository;
import com.vollos.feature.customsguard.repository.RegulationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.vollos.core.shared.UUIDv7;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

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
        // v8-C5: Capture tenant ID for RLS — chunks belong to the tenant that triggers embedding
        UUID tenantId = TenantContext.getCurrentTenantId();
        if (tenantId == null) {
            log.error("ALERT: chunkAndEmbedAll called without TenantContext — aborting to prevent data leak");
            return Map.of("chunked", 0, "embedded", 0, "failed", 0);
        }
        String tenantIdStr = tenantId.toString();

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
                            UUIDv7.generate().toString(), tenantIdStr, "REGULATION", sourceId, i, chunkText, summary, vectorStr, metadata);

                    embedded++;
                    chunked++;

                    if (embedded % 5 == 0) {
                        log.info("Embedded {}/{} chunks so far", embedded, countTotalChunks(regulations, chunks.size()));
                        // C3-VSLEEP: TimeUnit.sleep is VT-safe
                        java.util.concurrent.TimeUnit.MILLISECONDS.sleep(300);
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
        // M6-THAI-CHUNK: Thai text has no spaces between words — use multiple strategies
        int minBreak = start + CHUNK_SIZE / 2;

        // Priority 1: Double newline (paragraph break)
        for (int i = end; i > minBreak; i--) {
            if (i > 1 && text.charAt(i - 1) == '\n' && text.charAt(i - 2) == '\n') {
                return i;
            }
        }
        // Priority 2: Single newline
        for (int i = end; i > minBreak; i--) {
            if (text.charAt(i - 1) == '\n') {
                return i;
            }
        }
        // Priority 3: Thai sentence markers (ฯ, มาตรา/ข้อ pattern, Thai fullstop)
        for (int i = end; i > minBreak; i--) {
            char c = text.charAt(i - 1);
            if (c == '\u0E2F' /* ฯ */ || c == '。') return i;
            // Thai legal: "มาตรา" or "ข้อ" followed by space/number = section break
            if (c == ' ' && i >= 7 && text.substring(Math.max(0, i - 7), i - 1).contains("มาตรา")) return i - 1;
            if (c == ' ' && i >= 4 && text.substring(Math.max(0, i - 4), i - 1).contains("ข้อ")) return i - 1;
        }
        // Priority 4: Period/fullstop followed by space (sentence end)
        for (int i = end; i > minBreak; i--) {
            if (text.charAt(i - 1) == '.' && i < text.length() && (i == text.length() || text.charAt(i) == ' ' || text.charAt(i) == '\n')) {
                return i;
            }
        }
        // Priority 5: Space (Thai text uses spaces between clauses/phrases)
        for (int i = end; i > minBreak; i--) {
            if (text.charAt(i - 1) == ' ') return i;
        }
        // Priority 6: Tab or multiple spaces (common in Thai legal documents)
        for (int i = end; i > minBreak; i--) {
            char c = text.charAt(i - 1);
            if (c == '\t') return i;
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

    // v8-C3: Use Instant directly — avoids LocalDateTime timezone ambiguity (UTC vs Bangkok)
    private boolean isChunkStale(String sourceId, java.time.Instant regulationUpdatedAt) {
        try {
            java.time.Instant lastChunked = chunkRepo.findLatestCreatedAtBySourceId(sourceId);
            if (lastChunked == null) return true;
            return regulationUpdatedAt.isAfter(lastChunked);
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
