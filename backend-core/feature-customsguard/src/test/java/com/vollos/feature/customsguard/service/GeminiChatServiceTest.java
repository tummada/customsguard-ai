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
 * Unit tests for GeminiChatService — chat/vision API calls with error masking.
 */
@ExtendWith(MockitoExtension.class)
class GeminiChatServiceTest {

    private HttpClient mockHttpClient;
    private GeminiChatService service;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() throws Exception {
        mockHttpClient = mock(HttpClient.class);
        ObjectMapper objectMapper = new ObjectMapper();

        service = new GeminiChatService(
                objectMapper, "test-api-key",
                "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent");

        var field = GeminiChatService.class.getDeclaredField("httpClient");
        field.setAccessible(true);
        field.set(service, mockHttpClient);
    }

    private String buildGeminiResponse(String text) {
        return "{\"candidates\":[{\"content\":{\"parts\":[{\"text\":\"" + text + "\"}]}}]}";
    }

    // --- TC-CG-042: generateAnswer happy path ---
    @Test
    @DisplayName("TC-CG-042: generateAnswer — happy path ได้คำตอบจาก Gemini")
    @SuppressWarnings("unchecked")
    void generateAnswer_happyPath_returnsAnswer() throws Exception {
        HttpResponse<String> mockResponse = mock(HttpResponse.class);
        when(mockResponse.statusCode()).thenReturn(200);
        when(mockResponse.body()).thenReturn(buildGeminiResponse("กุ้งแช่แข็งอยู่ในพิกัด 0306.17"));
        when(mockHttpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(mockResponse);

        String answer = service.generateAnswer("พิกัดกุ้ง", "context text");

        assertThat(answer).contains("0306.17");
    }

    // --- TC-CG-043: generateAnswer API error → masked error message ---
    @Test
    @DisplayName("TC-CG-043: generateAnswer — API error ได้ข้อความ masked ไม่เปิดเผย internal")
    @SuppressWarnings("unchecked")
    void generateAnswer_apiError_returnsMaskedMessage() throws Exception {
        HttpResponse<String> mockResponse = mock(HttpResponse.class);
        when(mockResponse.statusCode()).thenReturn(500);
        when(mockResponse.body()).thenReturn("{\"error\":\"Internal server error\"}");
        when(mockHttpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(mockResponse);

        String answer = service.generateAnswer("กุ้ง", "context");

        assertThat(answer).isEqualTo("ขออภัย ไม่สามารถประมวลผลคำถามได้ในขณะนี้");
        // Should NOT contain internal error details
        assertThat(answer).doesNotContain("Internal server error");
        assertThat(answer).doesNotContain("500");
    }

    // --- TC-CG-044: generateAnswer empty candidates ---
    @Test
    @DisplayName("TC-CG-044: generateAnswer — empty candidates ได้ error message")
    @SuppressWarnings("unchecked")
    void generateAnswer_emptyCandidates_returnsMaskedMessage() throws Exception {
        HttpResponse<String> mockResponse = mock(HttpResponse.class);
        when(mockResponse.statusCode()).thenReturn(200);
        when(mockResponse.body()).thenReturn("{\"candidates\":[]}");
        when(mockHttpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(mockResponse);

        String answer = service.generateAnswer("กุ้ง", "context");

        assertThat(answer).isEqualTo("ขออภัย ไม่สามารถประมวลผลคำถามได้ในขณะนี้");
    }

    // --- TC-CG-045: generateAnswer network exception → masked ---
    @Test
    @DisplayName("TC-CG-045: generateAnswer — network exception ได้ masked error")
    @SuppressWarnings("unchecked")
    void generateAnswer_networkException_returnsMaskedMessage() throws Exception {
        when(mockHttpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenThrow(new IOException("Connection refused"));

        String answer = service.generateAnswer("กุ้ง", "context");

        assertThat(answer).isEqualTo("เกิดข้อผิดพลาดในการเชื่อมต่อ AI");
        assertThat(answer).doesNotContain("Connection refused");
    }

    // --- TC-CG-046: rawPrompt happy path ---
    @Test
    @DisplayName("TC-CG-046: rawPrompt — happy path ได้ raw text จาก Gemini")
    @SuppressWarnings("unchecked")
    void rawPrompt_happyPath_returnsText() throws Exception {
        HttpResponse<String> mockResponse = mock(HttpResponse.class);
        when(mockResponse.statusCode()).thenReturn(200);
        when(mockResponse.body()).thenReturn(buildGeminiResponse("[{\\\"hsCode\\\":\\\"0306.17\\\"}]"));
        when(mockHttpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(mockResponse);

        String result = service.rawPrompt("extract items from invoice");

        assertThat(result).isNotEmpty();
    }

    // --- TC-CG-047: rawPrompt API error → empty string ---
    @Test
    @DisplayName("TC-CG-047: rawPrompt — API error returns empty string (not exception)")
    @SuppressWarnings("unchecked")
    void rawPrompt_apiError_returnsEmpty() throws Exception {
        HttpResponse<String> mockResponse = mock(HttpResponse.class);
        when(mockResponse.statusCode()).thenReturn(429);
        when(mockResponse.body()).thenReturn("{\"error\":\"rate limited\"}");
        when(mockHttpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(mockResponse);

        String result = service.rawPrompt("prompt");

        assertThat(result).isEmpty();
    }

    // --- TC-CG-048: extractTextFromImage happy path ---
    @Test
    @DisplayName("TC-CG-048: extractTextFromImage — happy path ได้ text จาก image")
    @SuppressWarnings("unchecked")
    void extractTextFromImage_happyPath_returnsText() throws Exception {
        HttpResponse<String> mockResponse = mock(HttpResponse.class);
        when(mockResponse.statusCode()).thenReturn(200);
        when(mockResponse.body()).thenReturn(buildGeminiResponse("Extracted invoice text here"));
        when(mockHttpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(mockResponse);

        String result = service.extractTextFromImage(new byte[]{1, 2, 3}, "image/png");

        assertThat(result).contains("Extracted invoice text");
    }

    // --- TC-CG-049: extractTextFromImage API error → throws RuntimeException (audit v3 NEW-C3) ---
    @Test
    @DisplayName("TC-CG-049: extractTextFromImage — API error throws RuntimeException")
    @SuppressWarnings("unchecked")
    void extractTextFromImage_apiError_throwsRuntimeException() throws Exception {
        HttpResponse<String> mockResponse = mock(HttpResponse.class);
        when(mockResponse.statusCode()).thenReturn(500);
        when(mockResponse.body()).thenReturn("error");
        when(mockHttpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(mockResponse);

        assertThatThrownBy(() -> service.extractTextFromImage(new byte[]{1}, "image/png"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Gemini Vision OCR failed with status 500");
    }
}
