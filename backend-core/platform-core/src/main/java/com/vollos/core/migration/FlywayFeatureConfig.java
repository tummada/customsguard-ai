package com.vollos.core.migration;

import com.vollos.core.feature.FeatureRegistry;
import org.flywaydb.core.Flyway;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.ArrayList;

/**
 * Dynamically adds migration locations from all registered feature modules.
 * Each feature provides its own migration directory (e.g. classpath:db/migration/customsguard).
 */
@Configuration
public class FlywayFeatureConfig {

    @Bean
    public FlywayMigrationStrategy flywayMigrationStrategy(FeatureRegistry featureRegistry) {
        return flyway -> {
            var locations = new ArrayList<String>();
            locations.add("classpath:db/migration"); // Core migrations

            featureRegistry.getAllFeatures().forEach(fd ->
                    locations.add(fd.getMigrationLocation()));

            Flyway.configure()
                    .configuration(flyway.getConfiguration())
                    .locations(locations.toArray(String[]::new))
                    .load()
                    .migrate();
        };
    }
}
