package com.vollos.feature.customsguard.controller;

import com.vollos.feature.customsguard.service.HsLookupService;
import org.springframework.aot.generate.Generated;
import org.springframework.beans.factory.aot.BeanInstanceSupplier;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.beans.factory.support.RootBeanDefinition;

/**
 * Bean definitions for {@link HsLookupController}.
 */
@Generated
public class HsLookupController__BeanDefinitions {
  /**
   * Get the bean instance supplier for 'hsLookupController'.
   */
  private static BeanInstanceSupplier<HsLookupController> getHsLookupControllerInstanceSupplier() {
    return BeanInstanceSupplier.<HsLookupController>forConstructor(HsLookupService.class)
            .withGenerator((registeredBean, args) -> new HsLookupController(args.get(0)));
  }

  /**
   * Get the bean definition for 'hsLookupController'.
   */
  public static BeanDefinition getHsLookupControllerBeanDefinition() {
    RootBeanDefinition beanDefinition = new RootBeanDefinition(HsLookupController.class);
    beanDefinition.setInstanceSupplier(getHsLookupControllerInstanceSupplier());
    return beanDefinition;
  }
}
