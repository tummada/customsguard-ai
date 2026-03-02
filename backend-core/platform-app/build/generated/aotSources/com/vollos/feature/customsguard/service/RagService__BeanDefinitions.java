package com.vollos.feature.customsguard.service;

import com.vollos.feature.customsguard.repository.DocumentChunkRepository;
import org.springframework.aot.generate.Generated;
import org.springframework.beans.factory.aot.BeanInstanceSupplier;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.beans.factory.support.RootBeanDefinition;

/**
 * Bean definitions for {@link RagService}.
 */
@Generated
public class RagService__BeanDefinitions {
  /**
   * Get the bean instance supplier for 'ragService'.
   */
  private static BeanInstanceSupplier<RagService> getRagServiceInstanceSupplier() {
    return BeanInstanceSupplier.<RagService>forConstructor(GeminiEmbeddingService.class, DocumentChunkRepository.class, GeminiChatService.class)
            .withGenerator((registeredBean, args) -> new RagService(args.get(0), args.get(1), args.get(2)));
  }

  /**
   * Get the bean definition for 'ragService'.
   */
  public static BeanDefinition getRagServiceBeanDefinition() {
    RootBeanDefinition beanDefinition = new RootBeanDefinition(RagService.class);
    beanDefinition.setInstanceSupplier(getRagServiceInstanceSupplier());
    return beanDefinition;
  }
}
