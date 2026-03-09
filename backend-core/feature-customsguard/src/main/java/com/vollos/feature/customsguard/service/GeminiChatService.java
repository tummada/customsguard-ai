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
import java.util.Base64;
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

    /**
     * Extract text from an image using Gemini Vision (for scanned PDFs without text layer).
     */
    public String extractTextFromImage(byte[] imageBytes, String mimeType) {
        try {
            String base64Image = Base64.getEncoder().encodeToString(imageBytes);

            Map<String, Object> requestBody = Map.of(
                    "contents", List.of(
                            Map.of("parts", List.of(
                                    Map.of("inlineData", Map.of(
                                            "mimeType", mimeType,
                                            "data", base64Image
                                    )),
                                    Map.of("text", "Extract all text from this image. Return only the extracted text, preserving the original layout as much as possible. If the text is in Thai, keep it in Thai.")
                            ))
                    ),
                    "generationConfig", Map.of(
                            "temperature", 0.1,
                            "maxOutputTokens", 4096
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
                log.error("Gemini vision error: status={}, body={}", response.statusCode(),
                        truncateForLog(response.body()));
                return "";
            }

            JsonNode root = objectMapper.readTree(response.body());
            JsonNode candidates = root.path("candidates");
            if (candidates.isMissingNode() || !candidates.isArray() || candidates.isEmpty()) {
                log.warn("Gemini vision returned empty candidates");
                return "";
            }
            return candidates.get(0)
                    .path("content").path("parts").path(0)
                    .path("text").asText("");

        } catch (Exception e) {
            log.error("Failed to extract text from image via Gemini Vision", e);
            return "";
        }
    }

    /**
     * Send a raw prompt to Gemini (no system prompt wrapping).
     * Used by ScanWorkerService for HS code classification.
     */
    public String rawPrompt(String prompt) {
        try {
            Map<String, Object> requestBody = Map.of(
                    "contents", List.of(
                            Map.of("role", "user", "parts", List.of(
                                    Map.of("text", prompt)
                            ))
                    ),
                    "generationConfig", Map.of(
                            "temperature", 0.1,
                            "maxOutputTokens", 8192
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
                log.error("Gemini rawPrompt error: status={}, body={}", response.statusCode(),
                        truncateForLog(response.body()));
                return "";
            }

            JsonNode root = objectMapper.readTree(response.body());
            JsonNode candidates = root.path("candidates");
            if (candidates.isMissingNode() || !candidates.isArray() || candidates.isEmpty()) {
                log.warn("Gemini rawPrompt returned empty candidates");
                return "";
            }
            return candidates.get(0)
                    .path("content").path("parts").path(0)
                    .path("text").asText("");

        } catch (Exception e) {
            log.error("Failed to call Gemini rawPrompt", e);
            return "";
        }
    }

    public String generateAnswer(String query, String context) {
        try {
            String systemPrompt = """
                คุณคือ "VOLLOS AI" ผู้ช่วยด้านพิกัดศุลกากรไทย บุคลิกเป็นมืออาชีพแต่เป็นกันเอง ปฏิบัติตามกฎเหล่านี้อย่างเคร่งครัด:

                1. ตอบคำถามโดยอ้างอิง "เอกสารอ้างอิง" ที่ให้มาเป็นหลัก
                2. หากผู้ใช้พิมพ์มาเป็นเพียง "หัวข้อ" หรือ "คำสั้นๆ" (เช่น พิกัดศุลกากร, FTA, อัตราอากร) ห้ามตอบว่า "ไม่ทราบ" — ให้สรุปภาพรวมของหัวข้อนั้นจากเอกสาร และถามผู้ใช้ว่าต้องการทราบรายละเอียดของสินค้าชนิดใด
                3. หากข้อมูลในเอกสารไม่เพียงพอต่อคำถามเฉพาะเจาะจง ให้ตอบเท่าที่ข้อมูลระบุได้ และแนะนำให้ผู้ใช้ระบุ "ชื่อสินค้า" หรือ "เลขพิกัด" เพิ่มเติม (แทนการบอกว่าไม่ทราบทันที)
                4. ห้ามสร้าง URL ขึ้นเอง — ใช้เฉพาะ URL ที่ปรากฏในเอกสารอ้างอิง ถ้าไม่มี URL ที่สมบูรณ์ ไม่ต้องแสดงลิงก์
                5. ห้ามแต่ง HS code, อัตราอากร, หรือเลขที่ประกาศ ที่ไม่มีในเอกสาร — ใช้เฉพาะข้อมูลที่ปรากฏในเอกสารเท่านั้น
                6. **ห้ามใช้ข้อมูลสินค้าอื่นมาตอบแทนสินค้าที่ถาม** — เช่น ถ้าถามเรื่อง "กุ้งแช่แข็ง" ห้ามตอบด้วยพิกัดของ "กุ้งชุบเกล็ด" หรือ "กุ้งปรุงสุก" หากไม่มีข้อมูลที่ตรงกับสินค้าที่ถามในเอกสาร ให้บอกตรงๆ ว่ายังไม่มีข้อมูลสินค้านี้โดยเฉพาะ
                7. **เมื่อถามเปรียบเทียบ** (เช่น MFN vs FTA, อัตราปกติ vs สิทธิพิเศษ) ให้แสดงตารางหรือรายการเปรียบเทียบชัดเจน ถ้ามีข้อมูล FTA ในเอกสาร ให้ระบุ: ชื่อ FTA, ประเทศคู่ค้า, อัตราสิทธิพิเศษ, เทียบกับอัตรา MFN
                8. ตอบในภาษาเดียวกับคำถาม (ไทยหรืออังกฤษ) ใช้โทนสุภาพ เป็นกันเอง
                9. หากผู้ใช้ทักทาย ขอบคุณ หรือบ่นเกี่ยวกับคำตอบ ให้ตอบกลับอย่างสุภาพและใส่ใจ แล้วชวนกลับเข้าเรื่องศุลกากร
                10. หากคำถามมีทั้งเรื่องคุยเล่นและเรื่องศุลกากรผสมกัน ให้รับมุกสั้นๆ แล้วตอบเฉพาะส่วนที่เป็นเรื่องศุลกากร
                """;

            String userMessage = "เอกสารอ้างอิง:\n" + context + "\n\nคำถาม: " + query;

            Map<String, Object> requestBody = Map.of(
                    "contents", List.of(
                            Map.of("role", "user", "parts", List.of(
                                    Map.of("text", systemPrompt + "\n\n" + userMessage)
                            ))
                    ),
                    "generationConfig", Map.of(
                            "temperature", 0.1,
                            "maxOutputTokens", 1536
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
                log.error("Gemini chat error: status={}, body={}", response.statusCode(),
                        truncateForLog(response.body()));
                return "ขออภัย ไม่สามารถประมวลผลคำถามได้ในขณะนี้";
            }

            JsonNode root = objectMapper.readTree(response.body());
            JsonNode candidates = root.path("candidates");
            if (candidates.isMissingNode() || !candidates.isArray() || candidates.isEmpty()) {
                log.warn("Gemini chat returned empty candidates");
                return "ขออภัย ไม่สามารถประมวลผลคำถามได้ในขณะนี้";
            }
            return candidates.get(0)
                    .path("content").path("parts").path(0)
                    .path("text").asText("");

        } catch (Exception e) {
            log.error("Failed to call Gemini chat", e);
            return "เกิดข้อผิดพลาดในการเชื่อมต่อ AI";
        }
    }

    private static String truncateForLog(String body) {
        if (body == null) return "(null)";
        return body.length() > 500 ? body.substring(0, 500) + "...(truncated)" : body;
    }
}
