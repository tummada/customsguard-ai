package com.vollos.feature.customsguard.service;

import com.vollos.feature.customsguard.repository.FtaRateRepository;
import com.vollos.feature.customsguard.repository.HsCodeRepository;
import org.springframework.aot.generate.Generated;
import org.springframework.beans.factory.aot.BeanInstanceSupplier;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.beans.factory.support.RootBeanDefinition;

/**
 * Bean definitions for {@link HsLookupService}.
 */
@Generated
public class HsLookupService__BeanDefinitions {
  /**
   * Get the bean instance supplier for 'hsLookupService'.
   */
  private static BeanInstanceSupplier<HsLookupService> getHsLookupServiceInstanceSupplier() {
    return BeanInstanceSupplier.<HsLookupService>forConstructor(HsCodeRepository.class, FtaRateRepository.class)
            .withGenerator((registeredBean, args) -> new HsLookupService(args.get(0), args.get(1)));
  }

  /**
   * Get the bean definition for 'hsLookupService'.
   */
  public static BeanDefinition getHsLookupServiceBeanDefinition() {
    RootBeanDefinition beanDefinition = new RootBeanDefinition(HsLookupService.class);
    beanDefinition.setInstanceSupplier(getHsLookupServiceInstanceSupplier());
    return beanDefinition;
  }
}
