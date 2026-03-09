package com.vollos.core.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.util.Arrays;

@Component
public class SecretValidationConfig {

    private static final Logger log = LoggerFactory.getLogger(SecretValidationConfig.class);

    private final String jwtSecret;
    private final String adminSecret;
    private final Environment environment;

    public SecretValidationConfig(
            @Value("${jwt.secret:}") String jwtSecret,
            @Value("${admin.secret:}") String adminSecret,
            Environment environment) {
        this.jwtSecret = jwtSecret;
        this.adminSecret = adminSecret;
        this.environment = environment;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void validateSecrets() {
        boolean isDevProfile = Arrays.asList(environment.getActiveProfiles()).contains("dev")
                || Arrays.asList(environment.getActiveProfiles()).isEmpty();

        if (jwtSecret.contains("vollos-dev-secret") || jwtSecret.contains("change-in-production")) {
            if (isDevProfile) {
                log.warn("⚠️ JWT secret is using default dev value. Change in production!");
            } else {
                log.error("🚨 CRITICAL: JWT secret is using default dev value in non-dev profile! Set JWT_SECRET env var.");
                throw new IllegalStateException("Default JWT secret not allowed in production");
            }
        }

        if (adminSecret.contains("vollos-admin-secret-change-me")) {
            if (isDevProfile) {
                log.warn("⚠️ Admin secret is using default value. Change in production!");
            } else {
                log.error("🚨 CRITICAL: Admin secret is using default value in non-dev profile! Set ADMIN_SECRET env var.");
                throw new IllegalStateException("Default admin secret not allowed in production");
            }
        }
    }
}
