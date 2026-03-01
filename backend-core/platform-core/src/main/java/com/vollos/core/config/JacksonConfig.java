package com.vollos.core.config;

import com.fasterxml.jackson.module.blackbird.BlackbirdModule;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class JacksonConfig {

    @Bean
    public BlackbirdModule blackbirdModule() {
        return new BlackbirdModule();
    }
}
