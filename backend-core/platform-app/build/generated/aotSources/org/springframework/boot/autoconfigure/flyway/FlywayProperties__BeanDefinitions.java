package org.springframework.boot.autoconfigure.flyway;

import org.springframework.aot.generate.Generated;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.beans.factory.support.RootBeanDefinition;

/**
 * Bean definitions for {@link FlywayProperties}.
 */
@Generated
public class FlywayProperties__BeanDefinitions {
  /**
   * Get the bean definition for 'flywayProperties'.
   */
  public static BeanDefinition getFlywayPropertiesBeanDefinition() {
    RootBeanDefinition beanDefinition = new RootBeanDefinition(FlywayProperties.class);
    beanDefinition.setInstanceSupplier(FlywayProperties::new);
    return beanDefinition;
  }
}
