package com.vollos.feature.customsguard.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.lang.String;
import org.springframework.aot.generate.Generated;
import org.springframework.beans.factory.aot.BeanInstanceSupplier;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.beans.factory.support.RootBeanDefinition;

/**
 * Bean definitions for {@link GeminiEmbeddingService}.
 */
@Generated
public class GeminiEmbeddingService__BeanDefinitions {
  /**
   * Get the bean instance supplier for 'geminiEmbeddingService'.
   */
  private static BeanInstanceSupplier<GeminiEmbeddingService> getGeminiEmbeddingServiceInstanceSupplier(
      ) {
    return BeanInstanceSupplier.<GeminiEmbeddingService>forConstructor(ObjectMapper.class, String.class, String.class)
            .withGenerator((registeredBean, args) -> new GeminiEmbeddingService(args.get(0), args.get(1), args.get(2)));
  }

  /**
   * Get the bean definition for 'geminiEmbeddingService'.
   */
  public static BeanDefinition getGeminiEmbeddingServiceBeanDefinition() {
    RootBeanDefinition beanDefinition = new RootBeanDefinition(GeminiEmbeddingService.class);
    beanDefinition.setInstanceSupplier(getGeminiEmbeddingServiceInstanceSupplier());
    return beanDefinition;
  }
}
