package com.vollos.app;

import org.springframework.aot.generate.Generated;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.beans.factory.support.RootBeanDefinition;

/**
 * Bean definitions for {@link VollosApplication}.
 */
@Generated
public class VollosApplication__BeanDefinitions {
  /**
   * Get the bean definition for 'vollosApplication'.
   */
  public static BeanDefinition getVollosApplicationBeanDefinition() {
    RootBeanDefinition beanDefinition = new RootBeanDefinition(VollosApplication.class);
    beanDefinition.setInstanceSupplier(VollosApplication::new);
    return beanDefinition;
  }
}
