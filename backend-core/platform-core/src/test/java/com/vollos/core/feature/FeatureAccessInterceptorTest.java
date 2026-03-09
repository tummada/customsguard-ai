package com.vollos.core.feature;

import com.vollos.core.tenant.TenantContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.web.method.HandlerMethod;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

/**
 * TC-BE-040 ~ TC-BE-046: FeatureAccessInterceptor tests.
 */
@ExtendWith(MockitoExtension.class)
class FeatureAccessInterceptorTest {

    @Mock private TenantFeatureRepository tenantFeatureRepo;
    @Mock private HandlerMethod handlerMethod;

    private FeatureAccessInterceptor interceptor;
    private MockHttpServletRequest request;
    private MockHttpServletResponse response;

    @BeforeEach
    void setUp() {
        interceptor = new FeatureAccessInterceptor(tenantFeatureRepo);
        request = new MockHttpServletRequest();
        response = new MockHttpServletResponse();
        TenantContext.clear();
    }

    @AfterEach
    void tearDown() {
        TenantContext.clear();
    }

    @Test
    @DisplayName("TC-BE-040: handler ไม่ใช่ HandlerMethod — ผ่านเลย")
    void preHandle_withNonHandlerMethod_shouldReturnTrue() throws Exception {
        boolean result = interceptor.preHandle(request, response, new Object());

        assertThat(result).isTrue();
    }

    @Test
    @DisplayName("TC-BE-041: ไม่มี @RequiresFeature — ผ่านเลย")
    void preHandle_withNoRequiresFeatureAnnotation_shouldReturnTrue() throws Exception {
        when(handlerMethod.getMethodAnnotation(RequiresFeature.class)).thenReturn(null);
        when(handlerMethod.getBeanType()).thenReturn((Class) Object.class);

        boolean result = interceptor.preHandle(request, response, handlerMethod);

        assertThat(result).isTrue();
    }

    @Test
    @DisplayName("TC-BE-042: @RequiresFeature แต่ tenantId เป็น null — 401")
    void preHandle_withNoTenant_shouldReturn401() throws Exception {
        RequiresFeature rf = createRequiresFeature("customsguard");
        when(handlerMethod.getMethodAnnotation(RequiresFeature.class)).thenReturn(rf);

        // TenantContext is null
        boolean result = interceptor.preHandle(request, response, handlerMethod);

        assertThat(result).isFalse();
        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(response.getContentAsString()).contains("Tenant context not set");
    }

    @Test
    @DisplayName("TC-BE-043: tenant มี feature active — ผ่าน (return true)")
    void preHandle_withActiveFeature_shouldReturnTrue() throws Exception {
        UUID tenantId = UUID.randomUUID();
        TenantContext.setCurrentTenantId(tenantId);

        RequiresFeature rf = createRequiresFeature("customsguard");
        when(handlerMethod.getMethodAnnotation(RequiresFeature.class)).thenReturn(rf);
        when(tenantFeatureRepo.existsByTenantIdAndFeatureIdAndActiveTrue(tenantId, "customsguard"))
                .thenReturn(true);

        boolean result = interceptor.preHandle(request, response, handlerMethod);

        assertThat(result).isTrue();
    }

    @Test
    @DisplayName("TC-BE-044: tenant ไม่มี feature — 403 Forbidden")
    void preHandle_withNoFeatureAccess_shouldReturn403() throws Exception {
        UUID tenantId = UUID.randomUUID();
        TenantContext.setCurrentTenantId(tenantId);

        RequiresFeature rf = createRequiresFeature("customsguard");
        when(handlerMethod.getMethodAnnotation(RequiresFeature.class)).thenReturn(rf);
        when(tenantFeatureRepo.existsByTenantIdAndFeatureIdAndActiveTrue(tenantId, "customsguard"))
                .thenReturn(false);

        boolean result = interceptor.preHandle(request, response, handlerMethod);

        assertThat(result).isFalse();
        assertThat(response.getStatus()).isEqualTo(403);
        assertThat(response.getContentAsString()).contains("Feature Not Subscribed");
        assertThat(response.getContentAsString()).contains("customsguard");
    }

    @Test
    @DisplayName("TC-BE-045: cache hit — ไม่ query DB ซ้ำ")
    void preHandle_secondCall_shouldUseCacheAndNotQueryDbAgain() throws Exception {
        UUID tenantId = UUID.randomUUID();
        TenantContext.setCurrentTenantId(tenantId);

        RequiresFeature rf = createRequiresFeature("customsguard");
        when(handlerMethod.getMethodAnnotation(RequiresFeature.class)).thenReturn(rf);
        when(tenantFeatureRepo.existsByTenantIdAndFeatureIdAndActiveTrue(tenantId, "customsguard"))
                .thenReturn(true);

        // First call — should query DB
        interceptor.preHandle(request, response, handlerMethod);

        // Second call — should use cache
        MockHttpServletResponse response2 = new MockHttpServletResponse();
        interceptor.preHandle(request, response2, handlerMethod);

        // Repository should only be called once (Caffeine cache loader calls it once)
        verify(tenantFeatureRepo, times(1))
                .existsByTenantIdAndFeatureIdAndActiveTrue(tenantId, "customsguard");
    }

    @Test
    @DisplayName("TC-BE-046: @RequiresFeature บน class level — ตรวจจับได้")
    void preHandle_withClassLevelAnnotation_shouldCheck() throws Exception {
        UUID tenantId = UUID.randomUUID();
        TenantContext.setCurrentTenantId(tenantId);

        // Method-level annotation is null, but class-level has it
        when(handlerMethod.getMethodAnnotation(RequiresFeature.class)).thenReturn(null);

        @RequiresFeature("customsguard")
        class AnnotatedController {}

        when(handlerMethod.getBeanType()).thenReturn((Class) AnnotatedController.class);
        when(tenantFeatureRepo.existsByTenantIdAndFeatureIdAndActiveTrue(tenantId, "customsguard"))
                .thenReturn(true);

        boolean result = interceptor.preHandle(request, response, handlerMethod);

        assertThat(result).isTrue();
    }

    /**
     * Helper to create a @RequiresFeature annotation proxy.
     */
    private RequiresFeature createRequiresFeature(String value) {
        return new RequiresFeature() {
            @Override
            public String value() { return value; }
            @Override
            public Class<? extends java.lang.annotation.Annotation> annotationType() {
                return RequiresFeature.class;
            }
        };
    }
}
