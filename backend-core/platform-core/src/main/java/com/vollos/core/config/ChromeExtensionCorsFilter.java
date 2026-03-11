package com.vollos.core.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Handles CORS for Chrome Extension origins (chrome-extension://xxx).
 * Spring's CorsConfiguration doesn't support non-http schemes,
 * so we handle it manually before Spring Security runs.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class ChromeExtensionCorsFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String origin = request.getHeader("Origin");

        if (origin != null && origin.startsWith("chrome-extension://")) {
            response.setHeader("Access-Control-Allow-Origin", origin);
            response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
            response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Tenant-ID");
            response.setHeader("Access-Control-Expose-Headers", "X-Request-Id");
            response.setHeader("Access-Control-Max-Age", "3600");

            if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
                response.setStatus(HttpServletResponse.SC_OK);
                return;
            }
        }

        filterChain.doFilter(request, response);
    }
}
