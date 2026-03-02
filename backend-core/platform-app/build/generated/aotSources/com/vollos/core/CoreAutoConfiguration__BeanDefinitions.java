package com.vollos.core;

import org.springframework.aot.generate.Generated;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.beans.factory.support.RootBeanDefinition;

/**
 * Bean definitions for {@link CoreAutoConfiguration}.
 */
@Generated
public class CoreAutoConfiguration__BeanDefinitions {
  /**
   * Get the bean definition for 'coreAutoConfiguration'.
   */
  public static BeanDefinition getCoreAutoConfigurationBeanDefinition() {
    RootBeanDefinition beanDefinition = new RootBeanDefinition(CoreAutoConfiguration.class);
    beanDefinition.setInstanceSupplier(CoreAutoConfiguration::new);
    return beanDefinition;
  }
}
