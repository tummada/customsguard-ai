package com.vollos.core.tenant;

import javax.sql.DataSource;
import org.springframework.aot.generate.Generated;
import org.springframework.beans.factory.aot.BeanInstanceSupplier;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.beans.factory.support.RootBeanDefinition;

/**
 * Bean definitions for {@link TenantConnectionInterceptor}.
 */
@Generated
public class TenantConnectionInterceptor__BeanDefinitions {
  /**
   * Get the bean instance supplier for 'tenantConnectionInterceptor'.
   */
  private static BeanInstanceSupplier<TenantConnectionInterceptor> getTenantConnectionInterceptorInstanceSupplier(
      ) {
    return BeanInstanceSupplier.<TenantConnectionInterceptor>forConstructor(DataSource.class)
            .withGenerator((registeredBean, args) -> new TenantConnectionInterceptor(args.get(0)));
  }

  /**
   * Get the bean definition for 'tenantConnectionInterceptor'.
   */
  public static BeanDefinition getTenantConnectionInterceptorBeanDefinition() {
    RootBeanDefinition beanDefinition = new RootBeanDefinition(TenantConnectionInterceptor.class);
    beanDefinition.setInstanceSupplier(getTenantConnectionInterceptorInstanceSupplier());
    return beanDefinition;
  }
}
