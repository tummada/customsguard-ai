package com.vollos.feature.customsguard.controller;

import com.vollos.core.feature.RequiresFeature;
import com.vollos.feature.customsguard.dto.RagSearchRequest;
import com.vollos.feature.customsguard.dto.RagSearchResponse;
import com.vollos.feature.customsguard.service.DocumentChunkService;
import com.vollos.feature.customsguard.service.RagService;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.Map;

@RestController
@RequestMapping("/v1/customsguard/rag")
@RequiresFeature("customsguard")
public class RagController {

    private final RagService ragService;
    private final DocumentChunkService documentChunkService;

    public RagController(RagService ragService, DocumentChunkService documentChunkService) {
        this.ragService = ragService;
        this.documentChunkService = documentChunkService;
    }

    /** Standard request-response search */
    @PostMapping("/search")
    public RagSearchResponse search(@Valid @RequestBody RagSearchRequest request) {
        return ragService.search(request.query(), request.limit());
    }

    /**
     * SSE streaming: sends retrieval progress + answer chunks as they arrive.
     * Events: "sources" (retrieved chunks), "chunk" (answer token), "done" (complete).
     */
    @PostMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamSearch(@Valid @RequestBody RagSearchRequest request) {
        SseEmitter emitter = new SseEmitter(60_000L);
        ragService.streamSearch(request.query(), request.limit(), emitter);
        return emitter;
    }

    @PostMapping("/embed-all")
    public Map<String, Integer> embedAll() {
        return documentChunkService.chunkAndEmbedAll();
    }
}
