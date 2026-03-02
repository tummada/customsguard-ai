package com.vollos.feature.customsguard.service;

import com.vollos.feature.customsguard.repository.HsCodeRepository;
import org.springframework.aot.generate.Generated;
import org.springframework.beans.factory.aot.BeanInstanceSupplier;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.beans.factory.support.RootBeanDefinition;

/**
 * Bean definitions for {@link HsCodeService}.
 */
@Generated
public class HsCodeService__BeanDefinitions {
  /**
   * Get the bean instance supplier for 'hsCodeService'.
   */
  private static BeanInstanceSupplier<HsCodeService> getHsCodeServiceInstanceSupplier() {
    return BeanInstanceSupplier.<HsCodeService>forConstructor(HsCodeRepository.class, GeminiEmbeddingService.class)
            .withGenerator((registeredBean, args) -> new HsCodeService(args.get(0), args.get(1)));
  }

  /**
   * Get the bean definition for 'hsCodeService'.
   */
  public static BeanDefinition getHsCodeServiceBeanDefinition() {
    RootBeanDefinition beanDefinition = new RootBeanDefinition(HsCodeService.class);
    beanDefinition.setInstanceSupplier(getHsCodeServiceInstanceSupplier());
    return beanDefinition;
  }
}
