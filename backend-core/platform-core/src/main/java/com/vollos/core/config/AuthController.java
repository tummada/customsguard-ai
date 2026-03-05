package com.vollos.core.config;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import org.springframework.context.annotation.Profile;
import org.springframework.core.env.Environment;

import java.util.Arrays;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/v1/auth")
public class AuthController {

    private static final UUID DEV_TENANT_ID = UUID.fromString("a0000000-0000-0000-0000-000000000001");
    private static final String DEV_USER_ID = "dev-user-001";
    private static final String DEV_EMAIL = "dev@vollos.local";

    private final JwtTokenProvider tokenProvider;
    private final boolean isDevProfile;

    public AuthController(JwtTokenProvider tokenProvider, Environment env) {
        this.tokenProvider = tokenProvider;
        this.isDevProfile = Arrays.asList(env.getActiveProfiles()).contains("dev");
    }

    /**
     * Dev-only endpoint to generate a JWT token for testing.
     * Disabled in production profiles.
     */
    @PostMapping("/dev-token")
    public ResponseEntity<?> devToken() {
        if (!isDevProfile) {
            return ResponseEntity.status(404).build();
        }
        String token = tokenProvider.generateToken(DEV_TENANT_ID, DEV_USER_ID, DEV_EMAIL);
        return ResponseEntity.ok(Map.of(
                "accessToken", token,
                "tenantId", DEV_TENANT_ID.toString(),
                "userId", DEV_USER_ID,
                "email", DEV_EMAIL,
                "expiresIn", "24h"));
    }

    /**
     * Login endpoint for Chrome Extension.
     * Dev mode: accepts any email/password and returns a dev token.
     * Production: same behavior for now (MVP), will add proper auth later.
     */
    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> body) {
        String email = body.getOrDefault("email", DEV_EMAIL);
        String token = tokenProvider.generateToken(DEV_TENANT_ID, DEV_USER_ID, email);
        return ResponseEntity.ok(Map.of(
                "accessToken", token,
                "tenantId", DEV_TENANT_ID.toString(),
                "userId", DEV_USER_ID,
                "email", email,
                "expiresIn", "24h"));
    }
}
