package com.vollos.core.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vollos.core.shared.UUIDv7;
import com.vollos.core.user.UserEntity;
import com.vollos.core.user.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.persistence.EntityManager;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/v1/auth")
public class GoogleAuthController {

    private static final Logger log = LoggerFactory.getLogger(GoogleAuthController.class);
    private static final String GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo?id_token=";

    private final JwtTokenProvider tokenProvider;
    private final UserRepository userRepository;
    private final EntityManager entityManager;
    private final ObjectMapper objectMapper;
    private final String googleClientId;
    private final HttpClient httpClient;

    public GoogleAuthController(
            JwtTokenProvider tokenProvider,
            UserRepository userRepository,
            EntityManager entityManager,
            ObjectMapper objectMapper,
            @Value("${google.client-id}") String googleClientId) {
        this.tokenProvider = tokenProvider;
        this.userRepository = userRepository;
        this.entityManager = entityManager;
        this.objectMapper = objectMapper;
        this.googleClientId = googleClientId;
        this.httpClient = HttpClient.newHttpClient();
    }

    @PostMapping("/google")
    @Transactional
    public ResponseEntity<?> googleLogin(@RequestBody Map<String, String> body) {
        String idToken = body.get("idToken");
        if (idToken == null || idToken.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "idToken is required"));
        }

        try {
            // 1. Verify Google ID token
            GoogleUserInfo userInfo = verifyGoogleToken(idToken);
            if (userInfo == null) {
                return ResponseEntity.status(401).body(Map.of("error", "Invalid Google token"));
            }

            // 2. Find or create user
            UserEntity user = userRepository.findByGoogleId(userInfo.googleId)
                    .map(existing -> {
                        // Update profile on each login
                        existing.setEmail(userInfo.email);
                        existing.setName(userInfo.name);
                        existing.setAvatarUrl(userInfo.avatarUrl);
                        return userRepository.save(existing);
                    })
                    .orElseGet(() -> createNewUser(userInfo));

            // 3. Generate JWT
            String jwt = tokenProvider.generateToken(
                    user.getTenantId(),
                    user.getId().toString(),
                    user.getEmail());

            log.info("Google login: email={}, tenantId={}, new={}",
                    user.getEmail(), user.getTenantId(),
                    !userRepository.findByGoogleId(userInfo.googleId).isPresent());

            return ResponseEntity.ok(Map.of(
                    "accessToken", jwt,
                    "tenantId", user.getTenantId().toString(),
                    "userId", user.getId().toString(),
                    "email", user.getEmail(),
                    "name", user.getName() != null ? user.getName() : "",
                    "avatarUrl", user.getAvatarUrl() != null ? user.getAvatarUrl() : "",
                    "expiresIn", "24h"));

        } catch (Exception e) {
            log.error("Google auth failed: {}", e.getMessage());
            return ResponseEntity.status(401).body(Map.of("error", "Authentication failed"));
        }
    }

    private GoogleUserInfo verifyGoogleToken(String idToken) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(GOOGLE_TOKENINFO_URL + idToken))
                .GET()
                .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) {
            log.warn("Google tokeninfo returned {}", response.statusCode());
            return null;
        }

        JsonNode json = objectMapper.readTree(response.body());

        // Verify audience matches our client ID
        String aud = json.path("aud").asText();
        if (!googleClientId.equals(aud)) {
            log.warn("Token aud mismatch: expected={}, got={}", googleClientId, aud);
            return null;
        }

        // Verify email is verified
        if (!"true".equals(json.path("email_verified").asText())) {
            log.warn("Email not verified for {}", json.path("email").asText());
            return null;
        }

        return new GoogleUserInfo(
                json.path("sub").asText(),
                json.path("email").asText(),
                json.path("name").asText(""),
                json.path("picture").asText(""));
    }

    private UserEntity createNewUser(GoogleUserInfo info) {
        // Create new tenant
        UUID tenantId = UUIDv7.generate();
        entityManager.createNativeQuery(
                        "INSERT INTO tenants (id, name, plan_type) VALUES (?1, ?2, 'FREE')")
                .setParameter(1, tenantId)
                .setParameter(2, info.name != null && !info.name.isBlank() ? info.name : info.email)
                .executeUpdate();

        // Create FREE subscription
        entityManager.createNativeQuery(
                        "INSERT INTO tenant_subscriptions (id, tenant_id, plan_id) VALUES (?1, ?2, 'FREE')")
                .setParameter(1, UUIDv7.generate())
                .setParameter(2, tenantId)
                .executeUpdate();

        // Subscribe to customsguard feature
        entityManager.createNativeQuery(
                        "INSERT INTO tenant_features (id, tenant_id, feature_id, active) VALUES (?1, ?2, 'customsguard', true)")
                .setParameter(1, UUIDv7.generate())
                .setParameter(2, tenantId)
                .executeUpdate();

        // Create user
        UserEntity user = new UserEntity();
        user.setTenantId(tenantId);
        user.setGoogleId(info.googleId);
        user.setEmail(info.email);
        user.setName(info.name);
        user.setAvatarUrl(info.avatarUrl);
        return userRepository.save(user);
    }

    private record GoogleUserInfo(String googleId, String email, String name, String avatarUrl) {}
}
