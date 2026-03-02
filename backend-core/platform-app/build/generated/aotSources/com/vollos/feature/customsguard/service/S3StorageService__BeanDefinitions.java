package com.vollos.feature.customsguard.service;

import java.lang.String;
import org.springframework.aot.generate.Generated;
import org.springframework.beans.factory.aot.BeanInstanceSupplier;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.beans.factory.support.RootBeanDefinition;

/**
 * Bean definitions for {@link S3StorageService}.
 */
@Generated
public class S3StorageService__BeanDefinitions {
  /**
   * Get the bean instance supplier for 's3StorageService'.
   */
  private static BeanInstanceSupplier<S3StorageService> getSStorageServiceInstanceSupplier() {
    return BeanInstanceSupplier.<S3StorageService>forConstructor(String.class, String.class, String.class, String.class, String.class)
            .withGenerator((registeredBean, args) -> new S3StorageService(args.get(0), args.get(1), args.get(2), args.get(3), args.get(4)));
  }

  /**
   * Get the bean definition for 's3StorageService'.
   */
  public static BeanDefinition getSStorageServiceBeanDefinition() {
    RootBeanDefinition beanDefinition = new RootBeanDefinition(S3StorageService.class);
    beanDefinition.setInstanceSupplier(getSStorageServiceInstanceSupplier());
    return beanDefinition;
  }
}
