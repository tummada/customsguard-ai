package com.vollos.feature.customsguard;

import org.springframework.aot.generate.Generated;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.beans.factory.support.RootBeanDefinition;

/**
 * Bean definitions for {@link CustomsGuardFeature}.
 */
@Generated
public class CustomsGuardFeature__BeanDefinitions {
  /**
   * Get the bean definition for 'customsGuardFeature'.
   */
  public static BeanDefinition getCustomsGuardFeatureBeanDefinition() {
    RootBeanDefinition beanDefinition = new RootBeanDefinition(CustomsGuardFeature.class);
    beanDefinition.setInstanceSupplier(CustomsGuardFeature::new);
    return beanDefinition;
  }
}
