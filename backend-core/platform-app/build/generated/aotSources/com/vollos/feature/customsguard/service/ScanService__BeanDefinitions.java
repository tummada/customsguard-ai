package com.vollos.feature.customsguard.service;

import org.springframework.aot.generate.Generated;
import org.springframework.beans.factory.aot.BeanInstanceSupplier;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.beans.factory.support.RootBeanDefinition;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Bean definitions for {@link ScanService}.
 */
@Generated
public class ScanService__BeanDefinitions {
  /**
   * Get the bean instance supplier for 'scanService'.
   */
  private static BeanInstanceSupplier<ScanService> getScanServiceInstanceSupplier() {
    return BeanInstanceSupplier.<ScanService>forConstructor(S3StorageService.class, JdbcTemplate.class)
            .withGenerator((registeredBean, args) -> new ScanService(args.get(0), args.get(1)));
  }

  /**
   * Get the bean definition for 'scanService'.
   */
  public static BeanDefinition getScanServiceBeanDefinition() {
    RootBeanDefinition beanDefinition = new RootBeanDefinition(ScanService.class);
    beanDefinition.setInstanceSupplier(getScanServiceInstanceSupplier());
    return beanDefinition;
  }
}
