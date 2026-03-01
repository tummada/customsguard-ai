package com.vollos.core.feature;

/**
 * Contract that every vertical feature module must implement.
 * Spring Boot auto-discovers implementations on the classpath.
 */
public interface FeatureDefinition {

    /** Unique feature slug, e.g. "customsguard", "dental" */
    String getFeatureId();

    /** Human-readable name, e.g. "CustomsGuard - HS Code Management" */
    String getDisplayName();

    /** Description for the feature marketplace */
    String getDescription();

    /** Version string, e.g. "1.0.0" */
    String getVersion();

    /** Base API path prefix, e.g. "/v1/customsguard" */
    String getApiPrefix();

    /** Flyway migration location, e.g. "classpath:db/migration/customsguard" */
    String getMigrationLocation();
}
