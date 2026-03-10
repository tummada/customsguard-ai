package com.vollos.core.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.env.Environment;

import static org.assertj.core.api.Assertions.assertThatNoException;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

/**
 * TC-BE-047 ~ TC-BE-049: SecretValidationConfig tests.
 */
@ExtendWith(MockitoExtension.class)
class SecretValidationConfigTest {

    @Mock
    private Environment environment;

    @Test
    @DisplayName("TC-BE-047: default JWT secret ใน production profile → throw IllegalStateException")
    void validateSecrets_withDefaultJwtSecretInProd_shouldThrow() {
        when(environment.getActiveProfiles()).thenReturn(new String[]{"prod"});

        SecretValidationConfig config = new SecretValidationConfig(
                "vollos-dev-secret-key-change-in-production-min-32-chars!!",
                "safe-admin-secret-value",
                "real-gemini-api-key",
                environment);

        assertThatThrownBy(config::validateSecrets)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Default JWT secret not allowed in production");
    }

    @Test
    @DisplayName("TC-BE-048: default admin secret ใน production → throw IllegalStateException")
    void validateSecrets_withDefaultAdminSecretInProd_shouldThrow() {
        when(environment.getActiveProfiles()).thenReturn(new String[]{"prod"});

        SecretValidationConfig config = new SecretValidationConfig(
                "real-production-jwt-secret-at-least-32-chars-long!!!!",
                "vollos-admin-secret-change-me",
                "real-gemini-api-key",
                environment);

        assertThatThrownBy(config::validateSecrets)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Default admin secret not allowed in production");
    }

    @Test
    @DisplayName("TC-BE-047b: default JWT secret ใน dev profile → warn แต่ไม่ throw")
    void validateSecrets_withDefaultJwtSecretInDev_shouldNotThrow() {
        when(environment.getActiveProfiles()).thenReturn(new String[]{"dev"});

        SecretValidationConfig config = new SecretValidationConfig(
                "vollos-dev-secret-key-change-in-production-min-32-chars!!",
                "vollos-admin-secret-change-me",
                "real-gemini-api-key",
                environment);

        assertThatNoException().isThrownBy(config::validateSecrets);
    }

    @Test
    @DisplayName("TC-BE-047c: ไม่มี active profile (empty) → ถือเป็น dev → ไม่ throw")
    void validateSecrets_withNoActiveProfile_shouldNotThrow() {
        when(environment.getActiveProfiles()).thenReturn(new String[]{});

        SecretValidationConfig config = new SecretValidationConfig(
                "vollos-dev-secret-key-change-in-production-min-32-chars!!",
                "vollos-admin-secret-change-me",
                "real-gemini-api-key",
                environment);

        assertThatNoException().isThrownBy(config::validateSecrets);
    }

    @Test
    @DisplayName("TC-BE-047d: real secrets ใน production → ไม่ throw")
    void validateSecrets_withRealSecretsInProd_shouldNotThrow() {
        when(environment.getActiveProfiles()).thenReturn(new String[]{"prod"});

        SecretValidationConfig config = new SecretValidationConfig(
                "real-production-jwt-secret-at-least-32-chars-long!!!!",
                "real-production-admin-secret-value",
                "real-gemini-api-key",
                environment);

        assertThatNoException().isThrownBy(config::validateSecrets);
    }

    @Test
    @DisplayName("TC-BE-048b: JWT secret มีคำว่า 'change-in-production' ใน prod → throw")
    void validateSecrets_withChangeInProductionKeyword_shouldThrow() {
        when(environment.getActiveProfiles()).thenReturn(new String[]{"prod"});

        SecretValidationConfig config = new SecretValidationConfig(
                "my-custom-secret-but-has-change-in-production-marker!!!",
                "real-admin-secret",
                "real-gemini-api-key",
                environment);

        assertThatThrownBy(config::validateSecrets)
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    @DisplayName("TC-BE-049: geminiApiKey blank → warn แต่ไม่ throw (ทุก profile)")
    void validateSecrets_withBlankGeminiKey_shouldNotThrow() {
        when(environment.getActiveProfiles()).thenReturn(new String[]{"prod"});

        SecretValidationConfig config = new SecretValidationConfig(
                "real-production-jwt-secret-at-least-32-chars-long!!!!",
                "real-production-admin-secret-value",
                "",
                environment);

        assertThatNoException().isThrownBy(config::validateSecrets);
    }

    @Test
    @DisplayName("TC-BE-049b: geminiApiKey null → warn แต่ไม่ throw")
    void validateSecrets_withNullGeminiKey_shouldNotThrow() {
        when(environment.getActiveProfiles()).thenReturn(new String[]{"prod"});

        SecretValidationConfig config = new SecretValidationConfig(
                "real-production-jwt-secret-at-least-32-chars-long!!!!",
                "real-production-admin-secret-value",
                null,
                environment);

        assertThatNoException().isThrownBy(config::validateSecrets);
    }
}
