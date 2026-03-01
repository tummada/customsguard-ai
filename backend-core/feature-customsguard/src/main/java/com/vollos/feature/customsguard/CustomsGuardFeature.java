package com.vollos.feature.customsguard;

import com.vollos.core.feature.FeatureDefinition;
import org.springframework.stereotype.Component;

@Component
public class CustomsGuardFeature implements FeatureDefinition {

    @Override
    public String getFeatureId() {
        return "customsguard";
    }

    @Override
    public String getDisplayName() {
        return "CustomsGuard - HS Code Management";
    }

    @Override
    public String getDescription() {
        return "AI-powered customs declaration and HS code classification for import/export businesses";
    }

    @Override
    public String getVersion() {
        return "1.0.0";
    }

    @Override
    public String getApiPrefix() {
        return "/v1/customsguard";
    }

    @Override
    public String getMigrationLocation() {
        return "classpath:db/migration/customsguard";
    }
}
