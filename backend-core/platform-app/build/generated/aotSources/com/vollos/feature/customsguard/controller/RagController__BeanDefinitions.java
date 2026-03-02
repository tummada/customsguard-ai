package com.vollos.feature.customsguard.controller;

import com.vollos.feature.customsguard.service.RagService;
import org.springframework.aot.generate.Generated;
import org.springframework.beans.factory.aot.BeanInstanceSupplier;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.beans.factory.support.RootBeanDefinition;

/**
 * Bean definitions for {@link RagController}.
 */
@Generated
public class RagController__BeanDefinitions {
  /**
   * Get the bean instance supplier for 'ragController'.
   */
  private static BeanInstanceSupplier<RagController> getRagControllerInstanceSupplier() {
    return BeanInstanceSupplier.<RagController>forConstructor(RagService.class)
            .withGenerator((registeredBean, args) -> new RagController(args.get(0)));
  }

  /**
   * Get the bean definition for 'ragController'.
   */
  public static BeanDefinition getRagControllerBeanDefinition() {
    RootBeanDefinition beanDefinition = new RootBeanDefinition(RagController.class);
    beanDefinition.setInstanceSupplier(getRagControllerInstanceSupplier());
    return beanDefinition;
  }
}
