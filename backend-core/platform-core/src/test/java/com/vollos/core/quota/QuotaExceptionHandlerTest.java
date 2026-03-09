package com.vollos.core.quota;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * TC-BE-038 ~ TC-BE-039: QuotaExceptionHandler tests.
 */
class QuotaExceptionHandlerTest {

    private final QuotaExceptionHandler handler = new QuotaExceptionHandler();

    @Test
    @DisplayName("TC-BE-038: QuotaExceededException → 429 + error body ครบ")
    @SuppressWarnings("unchecked")
    void handleQuotaExceeded_shouldReturn429WithCorrectBody() {
        QuotaExceededException ex = new QuotaExceededException("scan", 11, 10, "FREE");

        ResponseEntity<Map<String, Object>> response = handler.handleQuotaExceeded(ex);

        assertThat(response.getStatusCode().value()).isEqualTo(429);

        Map<String, Object> body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.get("error")).isEqualTo("QUOTA_EXCEEDED");
        assertThat(body.get("usageType")).isEqualTo("scan");
        assertThat(body.get("current")).isEqualTo(11);
        assertThat(body.get("limit")).isEqualTo(10);
        assertThat(body.get("plan")).isEqualTo("FREE");
        assertThat(body.get("upgradeUrl")).isEqualTo("/pricing");
    }

    @Test
    @DisplayName("TC-BE-039: QuotaExceededException chat → 429 + usageType=chat")
    @SuppressWarnings("unchecked")
    void handleQuotaExceeded_chat_shouldReturnCorrectUsageType() {
        QuotaExceededException ex = new QuotaExceededException("chat", 4, 3, "FREE");

        ResponseEntity<Map<String, Object>> response = handler.handleQuotaExceeded(ex);

        assertThat(response.getStatusCode().value()).isEqualTo(429);
        Map<String, Object> body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.get("usageType")).isEqualTo("chat");
        assertThat(body.get("current")).isEqualTo(4);
        assertThat(body.get("limit")).isEqualTo(3);
        assertThat(body.get("message")).asString().contains("อัพเกรด");
    }
}
