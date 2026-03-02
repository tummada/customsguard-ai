package com.vollos.core.migration;

import com.vollos.core.feature.FeatureRegistry;
import org.springframework.aot.generate.Generated;
import org.springframework.beans.factory.aot.BeanInstanceSupplier;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.beans.factory.support.RootBeanDefinition;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.ConfigurationClassUtils;

/**
 * Bean definitions for {@link FlywayFeatureConfig}.
 */
@Generated
public class FlywayFeatureConfig__BeanDefinitions {
  /**
   * Get the bean definition for 'flywayFeatureConfig'.
   */
  public static BeanDefinition getFlywayFeatureConfigBeanDefinition() {
    RootBeanDefinition beanDefinition = new RootBeanDefinition(FlywayFeatureConfig.class);
    beanDefinition.setTargetType(FlywayFeatureConfig.class);
    ConfigurationClassUtils.initializeConfigurationClass(FlywayFeatureConfig.class);
    beanDefinition.setInstanceSupplier(FlywayFeatureConfig$$SpringCGLIB$$0::new);
    return beanDefinition;
  }

  /**
   * Get the bean instance supplier for 'flywayMigrationStrategy'.
   */
  private static BeanInstanceSupplier<FlywayMigrationStrategy> getFlywayMigrationStrategyInstanceSupplier(
      ) {
    return BeanInstanceSupplier.<FlywayMigrationStrategy>forFactoryMethod(FlywayFeatureConfig$$SpringCGLIB$$0.class, "flywayMigrationStrategy", FeatureRegistry.class)
            .withGenerator((registeredBean, args) -> registeredBean.getBeanFactory().getBean("flywayFeatureConfig", FlywayFeatureConfig.class).flywayMigrationStrategy(args.get(0)));
  }

  /**
   * Get the bean definition for 'flywayMigrationStrategy'.
   */
  public static BeanDefinition getFlywayMigrationStrategyBeanDefinition() {
    RootBeanDefinition beanDefinition = new RootBeanDefinition(FlywayMigrationStrategy.class);
    beanDefinition.setFactoryBeanName("flywayFeatureConfig");
    beanDefinition.setInstanceSupplier(getFlywayMigrationStrategyInstanceSupplier());
    return beanDefinition;
  }
}
