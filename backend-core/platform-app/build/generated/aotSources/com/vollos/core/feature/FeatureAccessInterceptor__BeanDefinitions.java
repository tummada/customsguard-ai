package com.vollos.core.feature;

import org.springframework.aot.generate.Generated;
import org.springframework.beans.factory.aot.BeanInstanceSupplier;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.beans.factory.support.RootBeanDefinition;

/**
 * Bean definitions for {@link FeatureAccessInterceptor}.
 */
@Generated
public class FeatureAccessInterceptor__BeanDefinitions {
  /**
   * Get the bean instance supplier for 'featureAccessInterceptor'.
   */
  private static BeanInstanceSupplier<FeatureAccessInterceptor> getFeatureAccessInterceptorInstanceSupplier(
      ) {
    return BeanInstanceSupplier.<FeatureAccessInterceptor>forConstructor(TenantFeatureRepository.class)
            .withGenerator((registeredBean, args) -> new FeatureAccessInterceptor(args.get(0)));
  }

  /**
   * Get the bean definition for 'featureAccessInterceptor'.
   */
  public static BeanDefinition getFeatureAccessInterceptorBeanDefinition() {
    RootBeanDefinition beanDefinition = new RootBeanDefinition(FeatureAccessInterceptor.class);
    beanDefinition.setInstanceSupplier(getFeatureAccessInterceptorInstanceSupplier());
    return beanDefinition;
  }
}
