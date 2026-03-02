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
import java.util.List;
import java.util.Map;

@Service
public class GeminiChatService {

    private static final Logger log = LoggerFactory.getLogger(GeminiChatService.class);

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final String apiKey;
    private final String chatUrl;

    public GeminiChatService(
            ObjectMapper objectMapper,
            @Value("${gemini.api-key}") String apiKey,
            @Value("${gemini.chat.url}") String chatUrl) {
        this.httpClient = HttpClient.newHttpClient();
        this.objectMapper = objectMapper;
        this.apiKey = apiKey;
        this.chatUrl = chatUrl;
    }

    public String generateAnswer(String query, String context) {
        try {
            String systemPrompt = """
                คุณคือผู้เชี่ยวชาญด้านพิธีการศุลกากรไทย
                ตอบคำถามโดยอ้างอิงข้อมูลที่ให้มาเท่านั้น
                ถ้าข้อมูลไม่เพียงพอ ให้บอกว่าไม่ทราบ อย่าเดา
                ตอบในภาษาเดียวกับคำถาม (ไทยหรืออังกฤษ)
                """;

            String userMessage = "เอกสารอ้างอิง:\n" + context + "\n\nคำถาม: " + query;

            Map<String, Object> requestBody = Map.of(
                    "contents", List.of(
                            Map.of("role", "user", "parts", List.of(
                                    Map.of("text", systemPrompt + "\n\n" + userMessage)
                            ))
                    ),
                    "generationConfig", Map.of(
                            "temperature", 0.2,
                            "maxOutputTokens", 1024
                    )
            );

            String json = objectMapper.writeValueAsString(requestBody);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(chatUrl + "?key=" + apiKey))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();

            HttpResponse<String> response = httpClient.send(request,
                    HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                log.error("Gemini chat error {}: {}", response.statusCode(), response.body());
                return "ขออภัย ไม่สามารถประมวลผลคำถามได้ในขณะนี้";
            }

            JsonNode root = objectMapper.readTree(response.body());
            return root.path("candidates").get(0)
                    .path("content").path("parts").get(0)
                    .path("text").asText();

        } catch (Exception e) {
            log.error("Failed to call Gemini chat", e);
            return "เกิดข้อผิดพลาดในการเชื่อมต่อ AI";
        }
    }
}
