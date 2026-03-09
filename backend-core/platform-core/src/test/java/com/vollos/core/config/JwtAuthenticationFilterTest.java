package com.vollos.core.config;

import com.vollos.core.tenant.TenantContext;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

import java.io.IOException;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * TC-BE-008 ~ TC-BE-012: JwtAuthenticationFilter tests.
 */
@ExtendWith(MockitoExtension.class)
class JwtAuthenticationFilterTest {

    @Mock
    private JwtTokenProvider tokenProvider;

    @Mock
    private FilterChain filterChain;

    private JwtAuthenticationFilter filter;
    private MockHttpServletRequest request;
    private MockHttpServletResponse response;

    @BeforeEach
    void setUp() {
        filter = new JwtAuthenticationFilter(tokenProvider);
        request = new MockHttpServletRequest();
        response = new MockHttpServletResponse();
        SecurityContextHolder.clearContext();
        TenantContext.clear();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
        TenantContext.clear();
    }

    @Test
    @DisplayName("TC-BE-008: Bearer token ถูกต้อง — set SecurityContext + TenantContext")
    void doFilter_withValidBearer_shouldSetSecurityAndTenantContext() throws ServletException, IOException {
        UUID tenantId = UUID.randomUUID();
        String userId = "user-123";
        String token = "valid.jwt.token";

        Claims claims = mock(Claims.class);

        when(tokenProvider.validateToken(token)).thenReturn(claims);
        when(tokenProvider.getUserId(claims)).thenReturn(userId);
        when(tokenProvider.getTenantId(claims)).thenReturn(tenantId);

        request.addHeader("Authorization", "Bearer " + token);

        filter.doFilterInternal(request, response, filterChain);

        // SecurityContext should be set
        var auth = SecurityContextHolder.getContext().getAuthentication();
        assertThat(auth).isNotNull();
        assertThat(auth.getPrincipal()).isEqualTo(userId);
        assertThat(auth.getAuthorities()).hasSize(1);

        // TenantContext should be set
        assertThat(TenantContext.getCurrentTenantId()).isEqualTo(tenantId);

        // Filter chain should continue
        verify(filterChain).doFilter(request, response);
    }

    @Test
    @DisplayName("TC-BE-009: ไม่มี Authorization header — ไม่ set auth, chain ต่อ")
    void doFilter_withNoHeader_shouldContinueWithoutAuth() throws ServletException, IOException {
        filter.doFilterInternal(request, response, filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(filterChain).doFilter(request, response);
    }

    @Test
    @DisplayName("TC-BE-010: Authorization ไม่ใช่ Bearer — ไม่ set auth, chain ต่อ")
    void doFilter_withNonBearerHeader_shouldContinueWithoutAuth() throws ServletException, IOException {
        request.addHeader("Authorization", "Basic dXNlcjpwYXNz");

        filter.doFilterInternal(request, response, filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(filterChain).doFilter(request, response);
        verify(tokenProvider, never()).validateToken(anyString());
    }

    @Test
    @DisplayName("TC-BE-011: token หมดอายุ/malformed — ไม่ set auth, chain ยังต่อได้")
    void doFilter_withExpiredToken_shouldContinueWithoutAuth() throws ServletException, IOException {
        when(tokenProvider.validateToken("expired.jwt.token"))
                .thenThrow(new JwtException("Token expired"));

        request.addHeader("Authorization", "Bearer expired.jwt.token");

        filter.doFilterInternal(request, response, filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(filterChain).doFilter(request, response);
    }

    @Test
    @DisplayName("TC-BE-012: token ผิดรูปแบบ — ไม่ set auth, chain ยังต่อได้")
    void doFilter_withMalformedToken_shouldContinueWithoutAuth() throws ServletException, IOException {
        when(tokenProvider.validateToken("not-a-jwt"))
                .thenThrow(new JwtException("Malformed token"));

        request.addHeader("Authorization", "Bearer not-a-jwt");

        filter.doFilterInternal(request, response, filterChain);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        verify(filterChain).doFilter(request, response);
    }
}
