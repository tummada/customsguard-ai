package com.vollos.core.config;

import com.vollos.core.feature.FeatureAccessInterceptor;
import com.vollos.core.tenant.TenantInterceptor;
import org.springframework.aot.generate.Generated;
import org.springframework.beans.factory.aot.BeanInstanceSupplier;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.beans.factory.support.RootBeanDefinition;
import org.springframework.context.annotation.ConfigurationClassUtils;

/**
 * Bean definitions for {@link WebMvcConfig}.
 */
@Generated
public class WebMvcConfig__BeanDefinitions {
  /**
   * Get the bean instance supplier for 'webMvcConfig'.
   */
  private static BeanInstanceSupplier<WebMvcConfig> getWebMvcConfigInstanceSupplier() {
    return BeanInstanceSupplier.<WebMvcConfig>forConstructor(TenantInterceptor.class, FeatureAccessInterceptor.class)
            .withGenerator((registeredBean, args) -> new WebMvcConfig$$SpringCGLIB$$0(args.get(0), args.get(1)));
  }

  /**
   * Get the bean definition for 'webMvcConfig'.
   */
  public static BeanDefinition getWebMvcConfigBeanDefinition() {
    RootBeanDefinition beanDefinition = new RootBeanDefinition(WebMvcConfig.class);
    beanDefinition.setTargetType(WebMvcConfig.class);
    ConfigurationClassUtils.initializeConfigurationClass(WebMvcConfig.class);
    beanDefinition.setInstanceSupplier(getWebMvcConfigInstanceSupplier());
    return beanDefinition;
  }
}
