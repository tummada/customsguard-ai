package com.vollos.core.config;

import com.fasterxml.jackson.module.blackbird.BlackbirdModule;
import org.springframework.aot.generate.Generated;
import org.springframework.beans.factory.aot.BeanInstanceSupplier;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.beans.factory.support.RootBeanDefinition;
import org.springframework.context.annotation.ConfigurationClassUtils;

/**
 * Bean definitions for {@link JacksonConfig}.
 */
@Generated
public class JacksonConfig__BeanDefinitions {
  /**
   * Get the bean definition for 'jacksonConfig'.
   */
  public static BeanDefinition getJacksonConfigBeanDefinition() {
    RootBeanDefinition beanDefinition = new RootBeanDefinition(JacksonConfig.class);
    beanDefinition.setTargetType(JacksonConfig.class);
    ConfigurationClassUtils.initializeConfigurationClass(JacksonConfig.class);
    beanDefinition.setInstanceSupplier(JacksonConfig$$SpringCGLIB$$0::new);
    return beanDefinition;
  }

  /**
   * Get the bean instance supplier for 'blackbirdModule'.
   */
  private static BeanInstanceSupplier<BlackbirdModule> getBlackbirdModuleInstanceSupplier() {
    return BeanInstanceSupplier.<BlackbirdModule>forFactoryMethod(JacksonConfig$$SpringCGLIB$$0.class, "blackbirdModule")
            .withGenerator((registeredBean) -> registeredBean.getBeanFactory().getBean("jacksonConfig", JacksonConfig.class).blackbirdModule());
  }

  /**
   * Get the bean definition for 'blackbirdModule'.
   */
  public static BeanDefinition getBlackbirdModuleBeanDefinition() {
    RootBeanDefinition beanDefinition = new RootBeanDefinition(BlackbirdModule.class);
    beanDefinition.setFactoryBeanName("jacksonConfig");
    beanDefinition.setInstanceSupplier(getBlackbirdModuleInstanceSupplier());
    return beanDefinition;
  }
}
