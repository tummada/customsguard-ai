package com.vollos.core.config;

import com.vollos.core.feature.FeatureAccessInterceptor;
import com.vollos.core.tenant.TenantInterceptor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    private final TenantInterceptor tenantInterceptor;
    private final FeatureAccessInterceptor featureAccessInterceptor;

    public WebMvcConfig(TenantInterceptor tenantInterceptor,
                        FeatureAccessInterceptor featureAccessInterceptor) {
        this.tenantInterceptor = tenantInterceptor;
        this.featureAccessInterceptor = featureAccessInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        // Tenant must be resolved first
        registry.addInterceptor(tenantInterceptor)
                .addPathPatterns("/v1/**")
                .order(0);

        // Feature access check runs after tenant is resolved
        registry.addInterceptor(featureAccessInterceptor)
                .addPathPatterns("/v1/**")
                .order(1);
    }
}
