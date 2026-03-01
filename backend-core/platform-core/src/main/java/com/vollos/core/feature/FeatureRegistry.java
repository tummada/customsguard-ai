package com.vollos.core.feature;

import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Collects all {@link FeatureDefinition} beans discovered on the classpath.
 * Core code queries this registry to enumerate installed features.
 */
@Component
public class FeatureRegistry {

    private final Map<String, FeatureDefinition> features;

    public FeatureRegistry(List<FeatureDefinition> featureDefinitions) {
        var map = new LinkedHashMap<String, FeatureDefinition>();
        for (FeatureDefinition fd : featureDefinitions) {
            map.put(fd.getFeatureId(), fd);
        }
        this.features = Collections.unmodifiableMap(map);
    }

    public Optional<FeatureDefinition> getFeature(String featureId) {
        return Optional.ofNullable(features.get(featureId));
    }

    public Collection<FeatureDefinition> getAllFeatures() {
        return features.values();
    }

    public boolean isFeatureInstalled(String featureId) {
        return features.containsKey(featureId);
    }
}
