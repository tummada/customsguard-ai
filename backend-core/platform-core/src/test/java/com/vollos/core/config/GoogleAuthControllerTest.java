package com.vollos.core.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.vollos.core.user.UserEntity;
import com.vollos.core.user.UserRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import java.lang.reflect.Field;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * TC-BE-013 ~ TC-BE-018: GoogleAuthController tests.
 */
@ExtendWith(MockitoExtension.class)
class GoogleAuthControllerTest {

    @Mock private JwtTokenProvider tokenProvider;
    @Mock private UserRepository userRepository;
    @Mock private EntityManager entityManager;
    @Mock private HttpClient httpClient;
    @Mock private Query nativeQuery;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private static final String GOOGLE_CLIENT_ID = "test-client-id.apps.googleusercontent.com";

    private GoogleAuthController controller;

    @BeforeEach
    void setUp() throws Exception {
        controller = new GoogleAuthController(
                tokenProvider, userRepository, entityManager, objectMapper, GOOGLE_CLIENT_ID);

        // Inject mock HttpClient via reflection (field is private final)
        Field httpClientField = GoogleAuthController.class.getDeclaredField("httpClient");
        httpClientField.setAccessible(true);
        httpClientField.set(controller, httpClient);
    }

    @Test
    @DisplayName("TC-BE-013: idToken null — 400 Bad Request")
    void googleLogin_withNullIdToken_shouldReturn400() {
        Map<String, String> body = Map.of();

        ResponseEntity<?> response = controller.googleLogin(body);

        assertThat(response.getStatusCode().value()).isEqualTo(400);
    }

    @Test
    @DisplayName("TC-BE-014: idToken blank — 400 Bad Request")
    void googleLogin_withBlankIdToken_shouldReturn400() {
        Map<String, String> body = Map.of("idToken", "   ");

        ResponseEntity<?> response = controller.googleLogin(body);

        assertThat(response.getStatusCode().value()).isEqualTo(400);
    }

    @Test
    @DisplayName("TC-BE-015: Google token ไม่ valid (tokeninfo returns non-200) — 401")
    @SuppressWarnings("unchecked")
    void googleLogin_withInvalidGoogleToken_shouldReturn401() throws Exception {
        HttpResponse<String> mockResponse = mock(HttpResponse.class);
        when(mockResponse.statusCode()).thenReturn(400);
        when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(mockResponse);

        Map<String, String> body = Map.of("idToken", "invalid-google-token");
        ResponseEntity<?> response = controller.googleLogin(body);

        assertThat(response.getStatusCode().value()).isEqualTo(401);
    }

    @Test
    @DisplayName("TC-BE-016: audience ไม่ตรง — 401 Unauthorized")
    @SuppressWarnings("unchecked")
    void googleLogin_withWrongAudience_shouldReturn401() throws Exception {
        String responseBody = """
                {"sub":"123","email":"test@gmail.com","email_verified":"true",\
                "aud":"wrong-client-id","name":"Test","picture":"https://pic.url"}""";

        HttpResponse<String> mockResponse = mock(HttpResponse.class);
        when(mockResponse.statusCode()).thenReturn(200);
        when(mockResponse.body()).thenReturn(responseBody);
        when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(mockResponse);

        Map<String, String> body = Map.of("idToken", "valid-but-wrong-aud");
        ResponseEntity<?> response = controller.googleLogin(body);

        assertThat(response.getStatusCode().value()).isEqualTo(401);
    }

    @Test
    @DisplayName("TC-BE-017: email ไม่ verified — 401 Unauthorized")
    @SuppressWarnings("unchecked")
    void googleLogin_withUnverifiedEmail_shouldReturn401() throws Exception {
        String responseBody = """
                {"sub":"123","email":"unverified@gmail.com","email_verified":"false",\
                "aud":"%s","name":"Test","picture":"https://pic.url"}"""
                .formatted(GOOGLE_CLIENT_ID);

        HttpResponse<String> mockResponse = mock(HttpResponse.class);
        when(mockResponse.statusCode()).thenReturn(200);
        when(mockResponse.body()).thenReturn(responseBody);
        when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(mockResponse);

        Map<String, String> body = Map.of("idToken", "unverified-email-token");
        ResponseEntity<?> response = controller.googleLogin(body);

        assertThat(response.getStatusCode().value()).isEqualTo(401);
    }

    @Test
    @DisplayName("TC-BE-018: Google login สำเร็จ — existing user → 200 + accessToken")
    @SuppressWarnings("unchecked")
    void googleLogin_withValidToken_existingUser_shouldReturn200() throws Exception {
        UUID tenantId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        String googleId = "google-sub-123";
        String email = "user@gmail.com";

        String responseBody = """
                {"sub":"%s","email":"%s","email_verified":"true",\
                "aud":"%s","name":"Test User","picture":"https://pic.url"}"""
                .formatted(googleId, email, GOOGLE_CLIENT_ID);

        HttpResponse<String> mockResponse = mock(HttpResponse.class);
        when(mockResponse.statusCode()).thenReturn(200);
        when(mockResponse.body()).thenReturn(responseBody);
        when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(mockResponse);

        // Existing user
        UserEntity existingUser = new UserEntity();
        existingUser.setId(userId);
        existingUser.setTenantId(tenantId);
        existingUser.setGoogleId(googleId);
        existingUser.setEmail(email);
        existingUser.setName("Test User");
        existingUser.setAvatarUrl("https://pic.url");

        when(userRepository.findByGoogleId(googleId)).thenReturn(Optional.of(existingUser));
        when(userRepository.save(any(UserEntity.class))).thenReturn(existingUser);
        when(tokenProvider.generateToken(eq(tenantId), eq(userId.toString()), eq(email), anyString()))
                .thenReturn("generated.jwt.token");

        Map<String, String> body = Map.of("idToken", "valid-google-token");
        ResponseEntity<?> response = controller.googleLogin(body);

        assertThat(response.getStatusCode().value()).isEqualTo(200);
        @SuppressWarnings("unchecked")
        Map<String, Object> responseMap = (Map<String, Object>) response.getBody();
        assertThat(responseMap).isNotNull();
        assertThat(responseMap.get("accessToken")).isEqualTo("generated.jwt.token");
        assertThat(responseMap.get("email")).isEqualTo(email);
        assertThat(responseMap.get("tenantId")).isEqualTo(tenantId.toString());
    }

    @Test
    @DisplayName("TC-BE-019: Google login สำเร็จ — new user → สร้าง tenant + user + 200")
    @SuppressWarnings("unchecked")
    void googleLogin_withValidToken_newUser_shouldCreateAndReturn200() throws Exception {
        String googleId = "new-google-sub-456";
        String email = "new@gmail.com";

        String responseBody = """
                {"sub":"%s","email":"%s","email_verified":"true",\
                "aud":"%s","name":"New User","picture":"https://newpic.url"}"""
                .formatted(googleId, email, GOOGLE_CLIENT_ID);

        HttpResponse<String> mockResponse = mock(HttpResponse.class);
        when(mockResponse.statusCode()).thenReturn(200);
        when(mockResponse.body()).thenReturn(responseBody);
        when(httpClient.send(any(HttpRequest.class), any(HttpResponse.BodyHandler.class)))
                .thenReturn(mockResponse);

        // No existing user — first call returns empty, second call (for log) also empty
        when(userRepository.findByGoogleId(googleId)).thenReturn(Optional.empty());

        // Mock native queries for tenant/subscription/feature creation
        when(entityManager.createNativeQuery(anyString())).thenReturn(nativeQuery);
        when(nativeQuery.setParameter(anyInt(), any())).thenReturn(nativeQuery);
        when(nativeQuery.executeUpdate()).thenReturn(1);

        // Mock save new user
        UserEntity savedUser = new UserEntity();
        UUID newUserId = UUID.randomUUID();
        UUID newTenantId = UUID.randomUUID();
        savedUser.setId(newUserId);
        savedUser.setTenantId(newTenantId);
        savedUser.setGoogleId(googleId);
        savedUser.setEmail(email);
        savedUser.setName("New User");
        savedUser.setAvatarUrl("https://newpic.url");

        when(userRepository.save(any(UserEntity.class))).thenReturn(savedUser);
        when(tokenProvider.generateToken(eq(newTenantId), eq(newUserId.toString()), eq(email), anyString()))
                .thenReturn("new-user.jwt.token");

        Map<String, String> body = Map.of("idToken", "valid-google-token");
        ResponseEntity<?> response = controller.googleLogin(body);

        assertThat(response.getStatusCode().value()).isEqualTo(200);

        // Verify tenant, subscription, and feature were created (3 native queries)
        verify(entityManager, times(3)).createNativeQuery(anyString());
        verify(userRepository).save(any(UserEntity.class));
    }
}
