package com.vollos.feature.customsguard.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.lang.String;
import org.springframework.aot.generate.Generated;
import org.springframework.beans.factory.aot.BeanInstanceSupplier;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.beans.factory.support.RootBeanDefinition;

/**
 * Bean definitions for {@link GeminiChatService}.
 */
@Generated
public class GeminiChatService__BeanDefinitions {
  /**
   * Get the bean instance supplier for 'geminiChatService'.
   */
  private static BeanInstanceSupplier<GeminiChatService> getGeminiChatServiceInstanceSupplier() {
    return BeanInstanceSupplier.<GeminiChatService>forConstructor(ObjectMapper.class, String.class, String.class)
            .withGenerator((registeredBean, args) -> new GeminiChatService(args.get(0), args.get(1), args.get(2)));
  }

  /**
   * Get the bean definition for 'geminiChatService'.
   */
  public static BeanDefinition getGeminiChatServiceBeanDefinition() {
    RootBeanDefinition beanDefinition = new RootBeanDefinition(GeminiChatService.class);
    beanDefinition.setInstanceSupplier(getGeminiChatServiceInstanceSupplier());
    return beanDefinition;
  }
}
