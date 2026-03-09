package com.vollos.core.tenant;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * TC-BE-024 ~ TC-BE-028: TenantInterceptor tests.
 */
class TenantInterceptorTest {

    private TenantInterceptor interceptor;
    private MockHttpServletRequest request;
    private MockHttpServletResponse response;

    @BeforeEach
    void setUp() {
        interceptor = new TenantInterceptor();
        request = new MockHttpServletRequest();
        response = new MockHttpServletResponse();
        TenantContext.clear();
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    @DisplayName("TC-BE-024: valid UUID header — set TenantContext + return true")
    void preHandle_withValidUuid_shouldSetContextAndContinue() throws Exception {
        UUID tenantId = UUID.randomUUID();
        request.addHeader("X-Tenant-ID", tenantId.toString());

        boolean result = interceptor.preHandle(request, response, new Object());

        assertThat(result).isTrue();
        assertThat(TenantContext.getCurrentTenantId()).isEqualTo(tenantId);
    }

    @Test
    @DisplayName("TC-BE-025: invalid UUID format — 400 + return false")
    void preHandle_withInvalidUuid_shouldReturn400() throws Exception {
        request.addHeader("X-Tenant-ID", "not-a-valid-uuid");

        boolean result = interceptor.preHandle(request, response, new Object());

        assertThat(result).isFalse();
        assertThat(response.getStatus()).isEqualTo(400);
        assertThat(response.getContentType()).isEqualTo("application/problem+json");
        assertThat(response.getContentAsString()).contains("Invalid X-Tenant-ID header format");
    }

    @Test
    @DisplayName("TC-BE-026: ไม่มี X-Tenant-ID header — ผ่านต่อ (TenantContext เป็น null)")
    void preHandle_withNoHeader_shouldContinueWithNullContext() throws Exception {
        boolean result = interceptor.preHandle(request, response, new Object());

        assertThat(result).isTrue();
        assertThat(TenantContext.getCurrentTenantId()).isNull();
    }

    @Test
    @DisplayName("TC-BE-027: blank header — ผ่านต่อ (TenantContext เป็น null)")
    void preHandle_withBlankHeader_shouldContinueWithNullContext() throws Exception {
        request.addHeader("X-Tenant-ID", "   ");

        boolean result = interceptor.preHandle(request, response, new Object());

        assertThat(result).isTrue();
        assertThat(TenantContext.getCurrentTenantId()).isNull();
    }

    @Test
    @DisplayName("TC-BE-028: afterCompletion — clear TenantContext")
    void afterCompletion_shouldClearTenantContext() {
        TenantContext.setCurrentTenantId(UUID.randomUUID());
        assertThat(TenantContext.getCurrentTenantId()).isNotNull();

        interceptor.afterCompletion(request, response, new Object(), null);

        assertThat(TenantContext.getCurrentTenantId()).isNull();
    }
}
