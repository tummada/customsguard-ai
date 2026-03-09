package com.vollos.feature.customsguard;

import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Minimal Spring Boot application for @WebMvcTest in the feature-customsguard module.
 * Only used for test context loading — not included in production builds.
 * <p>
 * Scans only the feature-customsguard package to avoid loading platform-core beans
 * (WebMvcConfig, FeatureAccessInterceptor) that require JPA repositories not available
 * in a @WebMvcTest slice.
 */
@SpringBootApplication(scanBasePackages = "com.vollos.feature.customsguard")
public class TestApplication {
}
