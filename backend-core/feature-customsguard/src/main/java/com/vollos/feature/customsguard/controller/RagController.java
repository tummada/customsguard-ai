package com.vollos.feature.customsguard.controller;

import com.vollos.core.feature.RequiresFeature;
import com.vollos.feature.customsguard.dto.RagSearchRequest;
import com.vollos.feature.customsguard.dto.RagSearchResponse;
import com.vollos.feature.customsguard.service.ChatGuardService;
import com.vollos.feature.customsguard.service.DocumentChunkService;
import com.vollos.feature.customsguard.service.RagService;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/v1/customsguard/rag")
@RequiresFeature("customsguard")
public class RagController {

    private final RagService ragService;
    private final DocumentChunkService documentChunkService;
    private final ChatGuardService chatGuard;

    public RagController(RagService ragService,
                         DocumentChunkService documentChunkService,
                         ChatGuardService chatGuard) {
        this.ragService = ragService;
        this.documentChunkService = documentChunkService;
        this.chatGuard = chatGuard;
    }

    /** Standard request-response search */
    @PostMapping("/search")
    public RagSearchResponse search(@Valid @RequestBody RagSearchRequest request) {
        Optional<String> blocked = chatGuard.check(request.query());
        if (blocked.isPresent()) {
            return new RagSearchResponse(blocked.get(), List.of(), 0);
        }
        return ragService.search(request.query(), request.limit());
    }

    /**
     * SSE streaming: sends retrieval progress + answer chunks as they arrive.
     * Events: "sources" (retrieved chunks), "chunk" (answer token), "done" (complete).
     */
    @PostMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamSearch(@Valid @RequestBody RagSearchRequest request) {
        SseEmitter emitter = new SseEmitter(60_000L);

        Optional<String> blocked = chatGuard.check(request.query());
        if (blocked.isPresent()) {
            try {
                emitter.send(SseEmitter.event().name("done")
                        .data(Map.of("answer", blocked.get(), "sources", List.of())));
                emitter.complete();
            } catch (IOException ignored) {}
            return emitter;
        }

        ragService.streamSearch(request.query(), request.limit(), emitter);
        return emitter;
    }

    @PostMapping("/embed-all")
    public Map<String, Integer> embedAll() {
        return documentChunkService.chunkAndEmbedAll();
    }
}
