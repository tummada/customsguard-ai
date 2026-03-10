package com.vollos.core.config;

import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

/**
 * Dev-only auth endpoint for E2E testing.
 * Returns a valid JWT without requiring Google OAuth.
 * Only available when spring.profiles.active=dev.
 */
@RestController
@RequestMapping("/v1/auth")
@Profile("dev")
public class DevAuthController {

    private static final UUID DEV_TENANT_ID = UUID.fromString("a0000000-0000-0000-0000-000000000001");
    private static final String DEV_USER_ID = "dev-user-001";
    private static final String DEV_EMAIL = "dev@vollos.local";

    private final JwtTokenProvider tokenProvider;

    public DevAuthController(JwtTokenProvider tokenProvider) {
        this.tokenProvider = tokenProvider;
    }

    @PostMapping("/dev-token")
    public ResponseEntity<?> devToken() {
        String jwt = tokenProvider.generateToken(DEV_TENANT_ID, DEV_USER_ID, DEV_EMAIL);
        return ResponseEntity.ok(Map.of(
                "accessToken", jwt,
                "tenantId", DEV_TENANT_ID.toString(),
                "userId", DEV_USER_ID,
                "email", DEV_EMAIL,
                "expiresIn", "24h"));
    }
}
