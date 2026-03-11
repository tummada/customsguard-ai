package com.vollos.core.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import jakarta.servlet.http.HttpServletRequest;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtFilter;
    private final org.springframework.core.env.Environment environment;

    public SecurityConfig(JwtAuthenticationFilter jwtFilter,
                          org.springframework.core.env.Environment environment) {
        this.jwtFilter = jwtFilter;
        this.environment = environment;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/v1/auth/**").permitAll()
                        .requestMatchers("/actuator/health").permitAll()
                        .requestMatchers("/v1/admin/**").hasRole("ADMIN")
                        .requestMatchers("/v1/**").authenticated()
                        .anyRequest().denyAll())
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        boolean isDev = Arrays.asList(environment.getActiveProfiles()).contains("dev");

        return request -> {
            CorsConfiguration config = new CorsConfiguration();
            config.setAllowedOriginPatterns(new ArrayList<>(List.of(
                    "https://vollos.ai",
                    "https://api.vollos.ai",
                    "https://www.vollos.ai"
            )));
            // Allow Chrome Extension origins (chrome-extension://xxx)
            String origin = request.getHeader("Origin");
            if (origin != null && origin.startsWith("chrome-extension://")) {
                config.addAllowedOrigin(origin);
            }
            // H1-CORS: Only allow localhost when "dev" profile is EXPLICITLY active (fail-closed)
            if (isDev) {
                config.addAllowedOriginPattern("http://localhost:[*]");
            }
            config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
            config.setAllowedHeaders(List.of("Content-Type", "Authorization", "X-Tenant-ID"));
            config.setExposedHeaders(List.of("X-Request-Id"));
            config.setAllowCredentials(false);
            config.setMaxAge(3600L);
            return config;
        };
    }
}
