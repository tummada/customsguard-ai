package com.vollos.core.tenant;

import org.springframework.aot.generate.Generated;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.beans.factory.support.RootBeanDefinition;

/**
 * Bean definitions for {@link TenantInterceptor}.
 */
@Generated
public class TenantInterceptor__BeanDefinitions {
  /**
   * Get the bean definition for 'tenantInterceptor'.
   */
  public static BeanDefinition getTenantInterceptorBeanDefinition() {
    RootBeanDefinition beanDefinition = new RootBeanDefinition(TenantInterceptor.class);
    beanDefinition.setInstanceSupplier(TenantInterceptor::new);
    return beanDefinition;
  }
}
