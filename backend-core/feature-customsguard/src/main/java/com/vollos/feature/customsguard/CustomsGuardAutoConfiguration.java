package com.vollos.feature.customsguard;

import com.vollos.feature.customsguard.config.ChatGuardProperties;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableScheduling;

@AutoConfiguration
@ComponentScan(basePackageClasses = CustomsGuardAutoConfiguration.class)
@EntityScan(basePackageClasses = CustomsGuardAutoConfiguration.class)
@EnableJpaRepositories(basePackageClasses = CustomsGuardAutoConfiguration.class)
@EnableConfigurationProperties(ChatGuardProperties.class)
@EnableScheduling
public class CustomsGuardAutoConfiguration {
}
