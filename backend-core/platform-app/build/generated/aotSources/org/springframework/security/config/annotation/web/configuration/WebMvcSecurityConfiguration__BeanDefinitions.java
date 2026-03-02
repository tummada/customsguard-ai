package org.springframework.security.config.annotation.web.configuration;

import java.lang.SuppressWarnings;
import java.util.List;
import org.springframework.aot.generate.Generated;
import org.springframework.beans.factory.aot.BeanInstanceSupplier;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.beans.factory.support.BeanDefinitionRegistryPostProcessor;
import org.springframework.beans.factory.support.ManagedList;
import org.springframework.beans.factory.support.RootBeanDefinition;
import org.springframework.web.servlet.support.RequestDataValueProcessor;

/**
 * Bean definitions for {@link WebMvcSecurityConfiguration}.
 */
@Generated
public class WebMvcSecurityConfiguration__BeanDefinitions {
  /**
   * Get the bean definition for 'webMvcSecurityConfiguration'.
   */
  public static BeanDefinition getWebMvcSecurityConfigurationBeanDefinition() {
    RootBeanDefinition beanDefinition = new RootBeanDefinition(WebMvcSecurityConfiguration.class);
    beanDefinition.setInstanceSupplier(WebMvcSecurityConfiguration::new);
    return beanDefinition;
  }

  /**
   * Get the bean instance supplier for 'requestDataValueProcessor'.
   */
  private static BeanInstanceSupplier<RequestDataValueProcessor> getRequestDataValueProcessorInstanceSupplier(
      ) {
    return BeanInstanceSupplier.<RequestDataValueProcessor>forFactoryMethod(WebMvcSecurityConfiguration.class, "requestDataValueProcessor")
            .withGenerator((registeredBean) -> registeredBean.getBeanFactory().getBean("org.springframework.security.config.annotation.web.configuration.WebMvcSecurityConfiguration", WebMvcSecurityConfiguration.class).requestDataValueProcessor());
  }

  /**
   * Get the bean definition for 'requestDataValueProcessor'.
   */
  public static BeanDefinition getRequestDataValueProcessorBeanDefinition() {
    RootBeanDefinition beanDefinition = new RootBeanDefinition(RequestDataValueProcessor.class);
    beanDefinition.setFactoryBeanName("org.springframework.security.config.annotation.web.configuration.WebMvcSecurityConfiguration");
    beanDefinition.setInstanceSupplier(getRequestDataValueProcessorInstanceSupplier());
    return beanDefinition;
  }

  /**
   * Get the bean definition for 'springSecurityHandlerMappingIntrospectorBeanDefinitionRegistryPostProcessor'.
   */
  public static BeanDefinition getSpringSecurityHandlerMappingIntrospectorBeanDefinitionRegistryPostProcessorBeanDefinition(
      ) {
    RootBeanDefinition beanDefinition = new RootBeanDefinition(WebMvcSecurityConfiguration.class);
    beanDefinition.setTargetType(BeanDefinitionRegistryPostProcessor.class);
    beanDefinition.setInstanceSupplier(BeanInstanceSupplier.<BeanDefinitionRegistryPostProcessor>forFactoryMethod(WebMvcSecurityConfiguration.class, "springSecurityHandlerMappingIntrospectorBeanDefinitionRegistryPostProcessor").withGenerator((registeredBean) -> WebMvcSecurityConfiguration.springSecurityHandlerMappingIntrospectorBeanDefinitionRegistryPostProcessor()));
    return beanDefinition;
  }

  /**
   * Bean definitions for {@link WebMvcSecurityConfiguration.HandlerMappingIntrospectorCacheFilterFactoryBean}.
   */
  @Generated
  public static class HandlerMappingIntrospectorCacheFilterFactoryBean {
    /**
     * Get the inner-bean definition for 'springSecurityFilterChainInnerBean'.
     */
    @SuppressWarnings("deprecation")
    public static BeanDefinition getSpringSecurityFilterChainInnerBeanBeanDefinition() {
      RootBeanDefinition beanDefinition = new RootBeanDefinition(WebMvcSecurityConfiguration.HandlerMappingIntrospectorCacheFilterFactoryBean.class);
      beanDefinition.setRole(BeanDefinition.ROLE_INFRASTRUCTURE);
      beanDefinition.setInstanceSupplier(WebMvcSecurityConfiguration.HandlerMappingIntrospectorCacheFilterFactoryBean::new);
      return beanDefinition;
    }
  }

  /**
   * Bean definitions for {@link WebMvcSecurityConfiguration.CompositeFilterChainProxy}.
   */
  @Generated
  public static class CompositeFilterChainProxy {
    /**
     * Get the bean instance supplier for 'springSecurityFilterChain'.
     */
    @SuppressWarnings("deprecation")
    private static BeanInstanceSupplier<WebMvcSecurityConfiguration.CompositeFilterChainProxy> getSpringSecurityFilterChainInstanceSupplier(
        ) {
      return BeanInstanceSupplier.<WebMvcSecurityConfiguration.CompositeFilterChainProxy>forConstructor(List.class)
              .withGenerator((registeredBean, args) -> new WebMvcSecurityConfiguration.CompositeFilterChainProxy(args.get(0)));
    }

    /**
     * Get the bean definition for 'springSecurityFilterChain'.
     */
    @SuppressWarnings("deprecation")
    public static BeanDefinition getSpringSecurityFilterChainBeanDefinition() {
      RootBeanDefinition beanDefinition = new RootBeanDefinition(WebMvcSecurityConfiguration.CompositeFilterChainProxy.class);
      beanDefinition.getConstructorArgumentValues().addIndexedArgumentValue(0, ManagedList.of(HandlerMappingIntrospectorCacheFilterFactoryBean.getSpringSecurityFilterChainInnerBeanBeanDefinition(), WebSecurityConfiguration__BeanDefinitions.CompositeFilterChainProxy.getSpringSecurityFilterChainInnerBeanBeanDefinition()));
      beanDefinition.setInstanceSupplier(getSpringSecurityFilterChainInstanceSupplier());
      return beanDefinition;
    }
  }
}
