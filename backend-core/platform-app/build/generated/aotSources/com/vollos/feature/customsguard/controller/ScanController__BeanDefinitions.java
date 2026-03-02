package com.vollos.feature.customsguard.controller;

import com.vollos.feature.customsguard.service.ScanService;
import org.springframework.aot.generate.Generated;
import org.springframework.beans.factory.aot.BeanInstanceSupplier;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.beans.factory.support.RootBeanDefinition;

/**
 * Bean definitions for {@link ScanController}.
 */
@Generated
public class ScanController__BeanDefinitions {
  /**
   * Get the bean instance supplier for 'scanController'.
   */
  private static BeanInstanceSupplier<ScanController> getScanControllerInstanceSupplier() {
    return BeanInstanceSupplier.<ScanController>forConstructor(ScanService.class)
            .withGenerator((registeredBean, args) -> new ScanController(args.get(0)));
  }

  /**
   * Get the bean definition for 'scanController'.
   */
  public static BeanDefinition getScanControllerBeanDefinition() {
    RootBeanDefinition beanDefinition = new RootBeanDefinition(ScanController.class);
    beanDefinition.setInstanceSupplier(getScanControllerInstanceSupplier());
    return beanDefinition;
  }
}
