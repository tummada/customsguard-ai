package com.vollos.core.feature;

import org.springframework.aot.generate.Generated;
import org.springframework.beans.factory.aot.BeanInstanceSupplier;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.beans.factory.support.RootBeanDefinition;

/**
 * Bean definitions for {@link FeatureController}.
 */
@Generated
public class FeatureController__BeanDefinitions {
  /**
   * Get the bean instance supplier for 'featureController'.
   */
  private static BeanInstanceSupplier<FeatureController> getFeatureControllerInstanceSupplier() {
    return BeanInstanceSupplier.<FeatureController>forConstructor(FeatureRegistry.class, TenantFeatureRepository.class)
            .withGenerator((registeredBean, args) -> new FeatureController(args.get(0), args.get(1)));
  }

  /**
   * Get the bean definition for 'featureController'.
   */
  public static BeanDefinition getFeatureControllerBeanDefinition() {
    RootBeanDefinition beanDefinition = new RootBeanDefinition(FeatureController.class);
    beanDefinition.setInstanceSupplier(getFeatureControllerInstanceSupplier());
    return beanDefinition;
  }
}
