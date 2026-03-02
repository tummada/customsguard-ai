package org.springframework.security.web.access;

import java.lang.SuppressWarnings;
import org.springframework.aot.generate.Generated;
import org.springframework.beans.factory.aot.BeanInstanceSupplier;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.beans.factory.config.RuntimeBeanReference;
import org.springframework.beans.factory.support.RootBeanDefinition;
import org.springframework.web.servlet.handler.HandlerMappingIntrospector;

/**
 * Bean definitions for {@link HandlerMappingIntrospectorRequestTransformer}.
 */
@Generated
public class HandlerMappingIntrospectorRequestTransformer__BeanDefinitions {
  /**
   * Get the bean instance supplier for 'mvcHandlerMappingIntrospectorRequestTransformer'.
   */
  @SuppressWarnings("removal")
  private static BeanInstanceSupplier<HandlerMappingIntrospectorRequestTransformer> getMvcHandlerMappingIntrospectorRequestTransformerInstanceSupplier(
      ) {
    return BeanInstanceSupplier.<HandlerMappingIntrospectorRequestTransformer>forConstructor(HandlerMappingIntrospector.class)
            .withGenerator((registeredBean, args) -> new HandlerMappingIntrospectorRequestTransformer(args.get(0)));
  }

  /**
   * Get the bean definition for 'mvcHandlerMappingIntrospectorRequestTransformer'.
   */
  @SuppressWarnings("removal")
  public static BeanDefinition getMvcHandlerMappingIntrospectorRequestTransformerBeanDefinition() {
    RootBeanDefinition beanDefinition = new RootBeanDefinition(HandlerMappingIntrospectorRequestTransformer.class);
    beanDefinition.getConstructorArgumentValues().addIndexedArgumentValue(0, new RuntimeBeanReference("mvcHandlerMappingIntrospector"));
    beanDefinition.setInstanceSupplier(getMvcHandlerMappingIntrospectorRequestTransformerInstanceSupplier());
    return beanDefinition;
  }
}
