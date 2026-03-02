package com.vollos.core.feature;

import java.util.List;
import org.springframework.aot.generate.Generated;
import org.springframework.beans.factory.aot.BeanInstanceSupplier;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.beans.factory.support.RootBeanDefinition;

/**
 * Bean definitions for {@link FeatureRegistry}.
 */
@Generated
public class FeatureRegistry__BeanDefinitions {
  /**
   * Get the bean instance supplier for 'featureRegistry'.
   */
  private static BeanInstanceSupplier<FeatureRegistry> getFeatureRegistryInstanceSupplier() {
    return BeanInstanceSupplier.<FeatureRegistry>forConstructor(List.class)
            .withGenerator((registeredBean, args) -> new FeatureRegistry(args.get(0)));
  }

  /**
   * Get the bean definition for 'featureRegistry'.
   */
  public static BeanDefinition getFeatureRegistryBeanDefinition() {
    RootBeanDefinition beanDefinition = new RootBeanDefinition(FeatureRegistry.class);
    beanDefinition.setInstanceSupplier(getFeatureRegistryInstanceSupplier());
    return beanDefinition;
  }
}
