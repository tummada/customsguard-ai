package com.vollos.core;

import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.domain.EntityScan;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@AutoConfiguration
@ComponentScan(basePackageClasses = CoreAutoConfiguration.class)
@EntityScan(basePackageClasses = CoreAutoConfiguration.class)
@EnableJpaRepositories(basePackageClasses = CoreAutoConfiguration.class)
public class CoreAutoConfiguration {
}
