package com.vollos.core.config;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/v1/auth")
public class AuthController {

    private static final UUID DEV_TENANT_ID = UUID.fromString("a0000000-0000-0000-0000-000000000001");
    private static final String DEV_USER_ID = "dev-user-001";
    private static final String DEV_EMAIL = "dev@vollos.local";

    private final JwtTokenProvider tokenProvider;

    public AuthController(JwtTokenProvider tokenProvider) {
        this.tokenProvider = tokenProvider;
    }

    /**
     * Dev-only endpoint to generate a JWT token for testing.
     * In production, this would be replaced by a proper login flow.
     */
    @PostMapping("/dev-token")
    public ResponseEntity<Map<String, Object>> devToken() {
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
