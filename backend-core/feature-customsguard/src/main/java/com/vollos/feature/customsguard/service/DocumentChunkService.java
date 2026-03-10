package com.vollos.feature.customsguard.service;

import com.vollos.feature.customsguard.entity.RegulationEntity;
import com.vollos.feature.customsguard.repository.DocumentChunkRepository;
import com.vollos.feature.customsguard.repository.RegulationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    public DocumentChunkService(RegulationRepository regulationRepo,
                                DocumentChunkRepository chunkRepo,
                                GeminiEmbeddingService embeddingService) {
        this.regulationRepo = regulationRepo;
        this.chunkRepo = chunkRepo;
        this.embeddingService = embeddingService;
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

            // Skip if already chunked
            if (alreadyChunked.contains(sourceId)) {
                log.info("Skipping regulation '{}' — already chunked", reg.getTitle());
                continue;
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
            log.error("ALERT: Chunk & embed completed with {} failures — some chunks missing from RAG", failed);
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

            // Next chunk starts with overlap
            start = end - OVERLAP;
            if (start <= chunks.size() * (CHUNK_SIZE - OVERLAP) - OVERLAP) {
                // Prevent infinite loop — force advance
                start = end;
            }
        }

        return chunks;
    }

    private int findSentenceBreak(String text, int start, int end) {
        // Look backwards from 'end' for sentence boundaries
        for (int i = end; i > start + CHUNK_SIZE / 2; i--) {
            char c = text.charAt(i - 1);
            if (c == '\n' || (c == ' ' && i > 1 && text.charAt(i - 2) == '.')) {
                return i;
            }
        }
        // Fallback: break at last space
        for (int i = end; i > start + CHUNK_SIZE / 2; i--) {
            if (text.charAt(i - 1) == ' ') {
                return i;
            }
        }
        return end;
    }

    private String buildMetadata(RegulationEntity reg, int sectionNumber) {
        StringBuilder sb = new StringBuilder("{");
        sb.append("\"doc_type\":\"").append(escape(reg.getDocType())).append("\"");
        sb.append(",\"title\":\"").append(escape(reg.getTitle())).append("\"");
        if (reg.getDocNumber() != null) {
            sb.append(",\"doc_number\":\"").append(escape(reg.getDocNumber())).append("\"");
        }
        if (reg.getIssuer() != null) {
            sb.append(",\"issuer\":\"").append(escape(reg.getIssuer())).append("\"");
        }
        if (reg.getSourceUrl() != null) {
            sb.append(",\"source_url\":\"").append(escape(reg.getSourceUrl())).append("\"");
        }
        sb.append(",\"section_number\":").append(sectionNumber + 1);
        sb.append("}");
        return sb.toString();
    }

    private String escape(String s) {
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private int countTotalChunks(List<RegulationEntity> regulations, int currentChunkSize) {
        // Rough estimate
        return regulations.size() * currentChunkSize;
    }
}
