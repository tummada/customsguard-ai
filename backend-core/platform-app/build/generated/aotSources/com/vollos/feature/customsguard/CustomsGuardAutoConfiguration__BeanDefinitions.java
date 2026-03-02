package com.vollos.feature.customsguard;

import org.springframework.aot.generate.Generated;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.beans.factory.support.RootBeanDefinition;

/**
 * Bean definitions for {@link CustomsGuardAutoConfiguration}.
 */
@Generated
public class CustomsGuardAutoConfiguration__BeanDefinitions {
  /**
   * Get the bean definition for 'customsGuardAutoConfiguration'.
   */
  public static BeanDefinition getCustomsGuardAutoConfigurationBeanDefinition() {
    RootBeanDefinition beanDefinition = new RootBeanDefinition(CustomsGuardAutoConfiguration.class);
    beanDefinition.setInstanceSupplier(CustomsGuardAutoConfiguration::new);
    return beanDefinition;
  }
}
