package org.springframework.boot.autoconfigure.security.servlet;

import org.springframework.aot.generate.Generated;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.beans.factory.support.RootBeanDefinition;

/**
 * Bean definitions for {@link SpringBootWebSecurityConfiguration}.
 */
@Generated
public class SpringBootWebSecurityConfiguration__BeanDefinitions {
  /**
   * Get the bean definition for 'springBootWebSecurityConfiguration'.
   */
  public static BeanDefinition getSpringBootWebSecurityConfigurationBeanDefinition() {
    RootBeanDefinition beanDefinition = new RootBeanDefinition(SpringBootWebSecurityConfiguration.class);
    beanDefinition.setInstanceSupplier(SpringBootWebSecurityConfiguration::new);
    return beanDefinition;
  }

  /**
   * Bean definitions for {@link SpringBootWebSecurityConfiguration.WebSecurityEnablerConfiguration}.
   */
  @Generated
  public static class WebSecurityEnablerConfiguration {
    /**
     * Get the bean definition for 'webSecurityEnablerConfiguration'.
     */
    public static BeanDefinition getWebSecurityEnablerConfigurationBeanDefinition() {
      RootBeanDefinition beanDefinition = new RootBeanDefinition(SpringBootWebSecurityConfiguration.WebSecurityEnablerConfiguration.class);
      beanDefinition.setInstanceSupplier(SpringBootWebSecurityConfiguration.WebSecurityEnablerConfiguration::new);
      return beanDefinition;
    }
  }
}
