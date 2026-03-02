package com.vollos.feature.customsguard.controller;

import com.vollos.feature.customsguard.service.HsCodeService;
import org.springframework.aot.generate.Generated;
import org.springframework.beans.factory.aot.BeanInstanceSupplier;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.beans.factory.support.RootBeanDefinition;

/**
 * Bean definitions for {@link HsCodeController}.
 */
@Generated
public class HsCodeController__BeanDefinitions {
  /**
   * Get the bean instance supplier for 'hsCodeController'.
   */
  private static BeanInstanceSupplier<HsCodeController> getHsCodeControllerInstanceSupplier() {
    return BeanInstanceSupplier.<HsCodeController>forConstructor(HsCodeService.class)
            .withGenerator((registeredBean, args) -> new HsCodeController(args.get(0)));
  }

  /**
   * Get the bean definition for 'hsCodeController'.
   */
  public static BeanDefinition getHsCodeControllerBeanDefinition() {
    RootBeanDefinition beanDefinition = new RootBeanDefinition(HsCodeController.class);
    beanDefinition.setInstanceSupplier(getHsCodeControllerInstanceSupplier());
    return beanDefinition;
  }
}
