package com.vollos.feature.customsguard.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.IOException;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for GeminiEmbeddingService — embedding API calls and utilities.
 */
@ExtendWith(MockitoExtension.class)
class GeminiEmbeddingServiceTest {

    private HttpClient mockHttpClient;
    private ObjectMapper objectMapper;
    private GeminiEmbeddingService service;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() throws Exception {
        mockHttpClient = mock(HttpClient.class);
        objectMapper = new ObjectMapper();

        // Use reflection to inject mock HttpClient since constructor creates its own
        service = new GeminiEmbeddingService(
                objectMapper, "test-api-key",
                "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent",
                768);

        // Replace httpClient via reflection
        var field = GeminiEmbeddingService.class.getDeclaredField("httpClient");
        field.setAccessible(true);
        field.set(service, mockHttpClient);
    }

    // --- TC-CG-035: embed happy path ---
    @Test
    @DisplayName("TC-CG-035: embed — happy path ส่ง text ได้ float[] 768 dims")
    @SuppressWarnings("unchecked")
    void embed_happyPath_returnsEmbedding() throws Exception {
        // Given: mock HTTP response with 768 values
        StringBuilder valuesJson = new StringBuilder("[");
        for (int i = 0; i < 768; i++) {
            if (i > 0) valuesJson.append(",");
            valuesJson.append(0.01 * i);
        }
        valuesJson.append("]");

        String responseBody = "{\"embedding\":{\"values\":" + valuesJson + "}}";
        HttpResponse<String> mockResponse = mock(HttpResponse.class);
        when(mockResponse.statusCode()).thenReturn(200);
        when(mockResponse.body()).thenReturn(responseBody);
        when(mockHttpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(mockResponse);

        // When
        float[] result = service.embed("กุ้งแช่แข็ง");

        // Then
        assertThat(result).hasSize(768);
        assertThat(result[0]).isEqualTo(0.0f);
        assertThat(result[1]).isCloseTo(0.01f, org.assertj.core.data.Offset.offset(0.001f));
    }

    // --- TC-CG-036: dimension mismatch ---
    @Test
    @DisplayName("TC-CG-036: embed — dimension mismatch (got 256 instead of 768) throws exception")
    @SuppressWarnings("unchecked")
    void embed_dimensionMismatch_throwsException() throws Exception {
        StringBuilder valuesJson = new StringBuilder("[");
        for (int i = 0; i < 256; i++) {
            if (i > 0) valuesJson.append(",");
            valuesJson.append(0.01);
        }
        valuesJson.append("]");

        String responseBody = "{\"embedding\":{\"values\":" + valuesJson + "}}";
        HttpResponse<String> mockResponse = mock(HttpResponse.class);
        when(mockResponse.statusCode()).thenReturn(200);
        when(mockResponse.body()).thenReturn(responseBody);
        when(mockHttpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(mockResponse);

        assertThatThrownBy(() -> service.embed("test"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("dimension mismatch")
                .hasMessageContaining("768")
                .hasMessageContaining("256");
    }

    // --- TC-CG-037: API timeout ---
    @Test
    @DisplayName("TC-CG-037: embed — API timeout ได้ RuntimeException wrapped")
    @SuppressWarnings("unchecked")
    void embed_apiTimeout_throwsWrappedException() throws Exception {
        when(mockHttpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenThrow(new IOException("Connection timed out"));

        assertThatThrownBy(() -> service.embed("test"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Failed to get embedding from Gemini");
    }

    // --- TC-CG-038: API error status code ---
    @Test
    @DisplayName("TC-CG-038: embed — API returns 500 ได้ RuntimeException")
    @SuppressWarnings("unchecked")
    void embed_apiError500_throwsException() throws Exception {
        HttpResponse<String> mockResponse = mock(HttpResponse.class);
        when(mockResponse.statusCode()).thenReturn(500);
        when(mockHttpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(mockResponse);

        assertThatThrownBy(() -> service.embed("test"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Embedding service unavailable");
    }

    // --- TC-CG-039: Empty values in response ---
    @Test
    @DisplayName("TC-CG-039: embed — API returns empty values array ได้ RuntimeException")
    @SuppressWarnings("unchecked")
    void embed_emptyValues_throwsException() throws Exception {
        String responseBody = "{\"embedding\":{\"values\":[]}}";
        HttpResponse<String> mockResponse = mock(HttpResponse.class);
        when(mockResponse.statusCode()).thenReturn(200);
        when(mockResponse.body()).thenReturn(responseBody);
        when(mockHttpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(mockResponse);

        assertThatThrownBy(() -> service.embed("test"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("empty values");
    }

    // --- TC-CG-040: toVectorString format ---
    @Test
    @DisplayName("TC-CG-040: toVectorString — float[] ได้ format [0.1,0.2,0.3]")
    void toVectorString_formatsCorrectly() {
        float[] embedding = new float[]{0.1f, 0.2f, 0.3f};

        String result = GeminiEmbeddingService.toVectorString(embedding);

        assertThat(result).startsWith("[");
        assertThat(result).endsWith("]");
        assertThat(result).contains("0.1");
        assertThat(result).contains("0.2");
        assertThat(result).contains("0.3");
        // Should not have spaces
        assertThat(result).doesNotContain(" ");
    }

    // --- TC-CG-041: toVectorString empty array ---
    @Test
    @DisplayName("TC-CG-041: toVectorString — empty array ได้ []")
    void toVectorString_emptyArray_returnsBrackets() {
        String result = GeminiEmbeddingService.toVectorString(new float[]{});
        assertThat(result).isEqualTo("[]");
    }

    // --- TC-CG-042: retry on failure — succeeds on third attempt ---
    @Test
    @DisplayName("TC-CG-042: embed — retry on failure, succeeds on third attempt")
    @SuppressWarnings("unchecked")
    void embed_retryOnFailure_succeedsOnThirdAttempt() throws Exception {
        // Given: first two calls throw IOException (wrapped to RuntimeException), third succeeds
        StringBuilder valuesJson = new StringBuilder("[");
        for (int i = 0; i < 768; i++) {
            if (i > 0) valuesJson.append(",");
            valuesJson.append(0.01 * i);
        }
        valuesJson.append("]");

        String responseBody = "{\"embedding\":{\"values\":" + valuesJson + "}}";
        HttpResponse<String> mockResponse = mock(HttpResponse.class);
        when(mockResponse.statusCode()).thenReturn(200);
        when(mockResponse.body()).thenReturn(responseBody);

        when(mockHttpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenThrow(new IOException("Connection refused"))
                .thenThrow(new IOException("Connection reset"))
                .thenReturn(mockResponse);

        // When
        float[] result = service.embed("กุ้งแช่แข็ง");

        // Then: should succeed with correct embedding
        assertThat(result).hasSize(768);
        verify(mockHttpClient, times(3)).send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class));
    }

    // --- TC-CG-043: all retries exhausted — throws last exception ---
    @Test
    @DisplayName("TC-CG-043: embed — all retries exhausted, throws last exception after 3 attempts")
    @SuppressWarnings("unchecked")
    void embed_allRetriesExhausted_throwsLastException() throws Exception {
        // Given: all three attempts fail with IOException
        when(mockHttpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenThrow(new IOException("Connection refused"))
                .thenThrow(new IOException("Connection reset"))
                .thenThrow(new IOException("Connection timed out"));

        // When/Then: should throw RuntimeException wrapping the last IOException
        assertThatThrownBy(() -> service.embed("test"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Failed to get embedding from Gemini")
                .hasCauseInstanceOf(IOException.class)
                .cause().hasMessageContaining("Connection timed out");

        verify(mockHttpClient, times(3)).send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class));
    }
}
