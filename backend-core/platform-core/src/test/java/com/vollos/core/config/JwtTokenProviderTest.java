package com.vollos.core.config;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * TC-BE-001 ~ TC-BE-007: JwtTokenProvider tests.
 */
class JwtTokenProviderTest {

    private static final String SECRET = "test-secret-key-must-be-at-least-32-characters-long!!";
    private static final long EXPIRATION_HOURS = 24;

    private JwtTokenProvider tokenProvider;

    @BeforeEach
    void setUp() {
        tokenProvider = new JwtTokenProvider(SECRET, EXPIRATION_HOURS);
    }

    @Test
    @DisplayName("TC-BE-001: สร้าง token สำเร็จ — มี tenantId, userId, email ใน claims")
    void generateToken_shouldContainCorrectClaims() {
        UUID tenantId = UUID.randomUUID();
        String userId = "user-123";
        String email = "test@example.com";

        String token = tokenProvider.generateToken(tenantId, userId, email);

        assertThat(token).isNotBlank();

        Claims claims = tokenProvider.validateToken(token);
        assertThat(claims.getSubject()).isEqualTo(userId);
        assertThat(claims.get("tenantId", String.class)).isEqualTo(tenantId.toString());
        assertThat(claims.get("email", String.class)).isEqualTo(email);
    }

    @Test
    @DisplayName("TC-BE-002: validate token สำเร็จ — คืน claims ที่ถูกต้อง")
    void validateToken_withValidToken_shouldReturnClaims() {
        UUID tenantId = UUID.randomUUID();
        String userId = "user-456";
        String email = "valid@test.com";

        String token = tokenProvider.generateToken(tenantId, userId, email);
        Claims claims = tokenProvider.validateToken(token);

        assertThat(claims).isNotNull();
        assertThat(claims.getExpiration()).isAfter(new Date());
        assertThat(claims.getIssuedAt()).isBeforeOrEqualTo(new Date());
    }

    @Test
    @DisplayName("TC-BE-003: token หมดอายุ — throw JwtException")
    void validateToken_withExpiredToken_shouldThrow() {
        // Create provider with 0 hours expiration (already expired)
        JwtTokenProvider expiredProvider = new JwtTokenProvider(SECRET, 0);
        UUID tenantId = UUID.randomUUID();

        // Build an explicitly expired token manually
        SecretKey key = Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));
        String expiredToken = Jwts.builder()
                .subject("user-expired")
                .claim("tenantId", tenantId.toString())
                .claim("email", "expired@test.com")
                .issuedAt(Date.from(Instant.now().minus(48, ChronoUnit.HOURS)))
                .expiration(Date.from(Instant.now().minus(24, ChronoUnit.HOURS)))
                .signWith(key)
                .compact();

        assertThatThrownBy(() -> tokenProvider.validateToken(expiredToken))
                .isInstanceOf(JwtException.class);
    }

    @Test
    @DisplayName("TC-BE-004: token ถูก tamper — throw JwtException")
    void validateToken_withTamperedToken_shouldThrow() {
        String token = tokenProvider.generateToken(UUID.randomUUID(), "user-1", "a@b.com");

        // Tamper by modifying a character in the signature part
        String tampered = token.substring(0, token.length() - 5) + "XXXXX";

        assertThatThrownBy(() -> tokenProvider.validateToken(tampered))
                .isInstanceOf(JwtException.class);
    }

    @Test
    @DisplayName("TC-BE-005: token ลงนามด้วย key อื่น — throw JwtException")
    void validateToken_withDifferentSigningKey_shouldThrow() {
        String otherSecret = "other-secret-key-at-least-32-characters-long-for-hmac!!!";
        JwtTokenProvider otherProvider = new JwtTokenProvider(otherSecret, 24);

        String tokenFromOther = otherProvider.generateToken(UUID.randomUUID(), "user-1", "a@b.com");

        assertThatThrownBy(() -> tokenProvider.validateToken(tokenFromOther))
                .isInstanceOf(JwtException.class);
    }

    @Test
    @DisplayName("TC-BE-006: getTenantId — แปลง claim เป็น UUID ได้ถูกต้อง")
    void getTenantId_shouldReturnCorrectUuid() {
        UUID tenantId = UUID.randomUUID();
        String token = tokenProvider.generateToken(tenantId, "user-1", "a@b.com");
        Claims claims = tokenProvider.validateToken(token);

        UUID result = tokenProvider.getTenantId(claims);

        assertThat(result).isEqualTo(tenantId);
    }

    @Test
    @DisplayName("TC-BE-007: getUserId — คืน subject ที่ตรงกับ userId")
    void getUserId_shouldReturnSubject() {
        String userId = "user-789";
        String token = tokenProvider.generateToken(UUID.randomUUID(), userId, "a@b.com");
        Claims claims = tokenProvider.validateToken(token);

        String result = tokenProvider.getUserId(claims);

        assertThat(result).isEqualTo(userId);
    }

    @Test
    @DisplayName("TC-BE-008: blank secret — throw IllegalStateException")
    void constructor_blankSecret_throwsIllegalStateException() {
        assertThatThrownBy(() -> new JwtTokenProvider("   ", 24))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("JWT_SECRET must be set");
    }

    @Test
    @DisplayName("TC-BE-009: null secret — throw IllegalStateException")
    void constructor_nullSecret_throwsIllegalStateException() {
        assertThatThrownBy(() -> new JwtTokenProvider(null, 24))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("JWT_SECRET must be set");
    }
}
