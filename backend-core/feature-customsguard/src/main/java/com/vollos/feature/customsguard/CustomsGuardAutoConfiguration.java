package com.vollos.feature.customsguard;

import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.scheduling.annotation.EnableScheduling;

@AutoConfiguration
@ComponentScan(basePackageClasses = CustomsGuardAutoConfiguration.class)
@EntityScan(basePackageClasses = CustomsGuardAutoConfiguration.class)
@EnableJpaRepositories(basePackageClasses = CustomsGuardAutoConfiguration.class)
@EnableScheduling
public class CustomsGuardAutoConfiguration {
}
