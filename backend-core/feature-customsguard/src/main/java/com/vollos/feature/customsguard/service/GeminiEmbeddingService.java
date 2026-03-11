package com.vollos.feature.customsguard.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class GeminiEmbeddingService {

    private static final Logger log = LoggerFactory.getLogger(GeminiEmbeddingService.class);

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final String apiKey;
    private final String modelUrl;
    private final int dimensions;

    // Circuit breaker state
    private static final int CIRCUIT_FAILURE_THRESHOLD = 5;
    private static final long CIRCUIT_COOLDOWN_MS = 60_000; // 60 seconds
    private final AtomicInteger consecutiveFailures = new AtomicInteger(0);
    private final AtomicLong circuitOpenedAt = new AtomicLong(0);
    // Circuit states: CLOSED (normal), OPEN (rejecting), HALF_OPEN (testing)
    private enum CircuitState { CLOSED, OPEN, HALF_OPEN }

    public GeminiEmbeddingService(
            ObjectMapper objectMapper,
            @Value("${gemini.api-key}") String apiKey,
            @Value("${gemini.embedding.url}") String modelUrl,
            @Value("${gemini.embedding.dimensions:768}") int dimensions) {
        this.httpClient = HttpClient.newHttpClient();
        this.objectMapper = objectMapper;
        this.apiKey = apiKey;
        this.modelUrl = modelUrl;
        this.dimensions = dimensions;
    }

    private static final int MAX_RETRIES = 3;
    private static final long BASE_RETRY_DELAY_MS = 1_000;

    private CircuitState getCircuitState() {
        int failures = consecutiveFailures.get();
        if (failures < CIRCUIT_FAILURE_THRESHOLD) {
            return CircuitState.CLOSED;
        }
        long openedAt = circuitOpenedAt.get();
        if (System.currentTimeMillis() - openedAt >= CIRCUIT_COOLDOWN_MS) {
            return CircuitState.HALF_OPEN;
        }
        return CircuitState.OPEN;
    }

    private void recordSuccess() {
        int prev = consecutiveFailures.getAndSet(0);
        if (prev >= CIRCUIT_FAILURE_THRESHOLD) {
            log.info("Circuit breaker CLOSED — Gemini API recovered after {} consecutive failures", prev);
        }
    }

    private void recordFailure() {
        int failures = consecutiveFailures.incrementAndGet();
        if (failures == CIRCUIT_FAILURE_THRESHOLD) {
            circuitOpenedAt.set(System.currentTimeMillis());
            log.error("Circuit breaker OPEN — Gemini API failed {} consecutive times, " +
                    "rejecting calls for {}s", failures, CIRCUIT_COOLDOWN_MS / 1000);
        }
    }

    public float[] embed(String text) {
        // Circuit breaker check
        CircuitState state = getCircuitState();
        if (state == CircuitState.OPEN) {
            long remainingMs = CIRCUIT_COOLDOWN_MS - (System.currentTimeMillis() - circuitOpenedAt.get());
            throw new RuntimeException("Gemini API circuit breaker is OPEN — " +
                    "too many consecutive failures. Retry after " + (remainingMs / 1000) + "s");
        }
        if (state == CircuitState.HALF_OPEN) {
            log.info("Circuit breaker HALF_OPEN — testing Gemini API with single request");
        }

        RuntimeException lastException = null;
        for (int attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                float[] result = doEmbed(text);
                recordSuccess();
                return result;
            } catch (RuntimeException e) {
                lastException = e;
                recordFailure();
                if (attempt < MAX_RETRIES) {
                    // Re-check circuit after recording failure
                    if (getCircuitState() == CircuitState.OPEN) {
                        throw new RuntimeException("Gemini API circuit breaker OPEN after " +
                                consecutiveFailures.get() + " consecutive failures", e);
                    }
                    long delay = BASE_RETRY_DELAY_MS * (1L << (attempt - 1));
                    log.warn("Embedding failed (attempt {}/{}), retrying in {}ms: {}",
                            attempt, MAX_RETRIES, delay, e.getMessage());
                    // C3-VSLEEP: TimeUnit.sleep is VT-safe
                    try { java.util.concurrent.TimeUnit.MILLISECONDS.sleep(delay); } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        throw e;
                    }
                }
            }
        }
        throw lastException;
    }

    private float[] doEmbed(String text) {
        try {
            String requestBody = objectMapper.writeValueAsString(
                    new EmbedRequest(new Content(new Part[]{new Part(text)}), dimensions));

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(modelUrl))
                    .header("Content-Type", "application/json")
                    .header("x-goog-api-key", apiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                    .build();

            HttpResponse<String> response = httpClient.send(request,
                    HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                log.error("Gemini embedding API error: status={}", response.statusCode());
                throw new RuntimeException("Embedding service unavailable (status=" + response.statusCode() + ")");
            }

            JsonNode root = objectMapper.readTree(response.body());
            JsonNode values = root.path("embedding").path("values");

            if (values.isMissingNode() || !values.isArray() || values.isEmpty()) {
                log.error("Gemini embedding returned no values");
                throw new RuntimeException("Embedding service returned empty values");
            }

            if (values.size() != dimensions) {
                log.error("Embedding dimension mismatch: expected={}, got={}", dimensions, values.size());
                throw new RuntimeException("Embedding dimension mismatch: expected " + dimensions + " but got " + values.size());
            }

            float[] embedding = new float[values.size()];
            for (int i = 0; i < values.size(); i++) {
                embedding[i] = (float) values.get(i).asDouble();
            }
            return embedding;

        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Failed to get embedding from Gemini", e);
        }
    }

    public static String toVectorString(float[] embedding) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < embedding.length; i++) {
            if (i > 0) sb.append(",");
            sb.append(embedding[i]);
        }
        return sb.append("]").toString();
    }

    private record EmbedRequest(Content content, int outputDimensionality) {}
    private record Content(Part[] parts) {}
    private record Part(String text) {}
}
