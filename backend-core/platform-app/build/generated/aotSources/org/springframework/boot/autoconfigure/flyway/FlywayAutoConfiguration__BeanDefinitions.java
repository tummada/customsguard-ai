package org.springframework.boot.autoconfigure.flyway;

import org.flywaydb.core.Flyway;
import org.springframework.aot.generate.Generated;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.aot.BeanInstanceSupplier;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.beans.factory.support.RootBeanDefinition;
import org.springframework.core.io.ResourceLoader;

/**
 * Bean definitions for {@link FlywayAutoConfiguration}.
 */
@Generated
public class FlywayAutoConfiguration__BeanDefinitions {
  /**
   * Get the bean definition for 'flywayAutoConfiguration'.
   */
  public static BeanDefinition getFlywayAutoConfigurationBeanDefinition() {
    RootBeanDefinition beanDefinition = new RootBeanDefinition(FlywayAutoConfiguration.class);
    beanDefinition.setInstanceSupplier(FlywayAutoConfiguration::new);
    return beanDefinition;
  }

  /**
   * Get the bean instance supplier for 'stringOrNumberMigrationVersionConverter'.
   */
  private static BeanInstanceSupplier<FlywayAutoConfiguration.StringOrNumberToMigrationVersionConverter> getStringOrNumberMigrationVersionConverterInstanceSupplier(
      ) {
    return BeanInstanceSupplier.<FlywayAutoConfiguration.StringOrNumberToMigrationVersionConverter>forFactoryMethod(FlywayAutoConfiguration.class, "stringOrNumberMigrationVersionConverter")
            .withGenerator((registeredBean) -> registeredBean.getBeanFactory().getBean("org.springframework.boot.autoconfigure.flyway.FlywayAutoConfiguration", FlywayAutoConfiguration.class).stringOrNumberMigrationVersionConverter());
  }

  /**
   * Get the bean definition for 'stringOrNumberMigrationVersionConverter'.
   */
  public static BeanDefinition getStringOrNumberMigrationVersionConverterBeanDefinition() {
    RootBeanDefinition beanDefinition = new RootBeanDefinition(FlywayAutoConfiguration.StringOrNumberToMigrationVersionConverter.class);
    beanDefinition.setFactoryBeanName("org.springframework.boot.autoconfigure.flyway.FlywayAutoConfiguration");
    beanDefinition.setInstanceSupplier(getStringOrNumberMigrationVersionConverterInstanceSupplier());
    return beanDefinition;
  }

  /**
   * Get the bean instance supplier for 'flywayDefaultDdlModeProvider'.
   */
  private static BeanInstanceSupplier<FlywaySchemaManagementProvider> getFlywayDefaultDdlModeProviderInstanceSupplier(
      ) {
    return BeanInstanceSupplier.<FlywaySchemaManagementProvider>forFactoryMethod(FlywayAutoConfiguration.class, "flywayDefaultDdlModeProvider", ObjectProvider.class)
            .withGenerator((registeredBean, args) -> registeredBean.getBeanFactory().getBean("org.springframework.boot.autoconfigure.flyway.FlywayAutoConfiguration", FlywayAutoConfiguration.class).flywayDefaultDdlModeProvider(args.get(0)));
  }

  /**
   * Get the bean definition for 'flywayDefaultDdlModeProvider'.
   */
  public static BeanDefinition getFlywayDefaultDdlModeProviderBeanDefinition() {
    RootBeanDefinition beanDefinition = new RootBeanDefinition(FlywaySchemaManagementProvider.class);
    beanDefinition.setFactoryBeanName("org.springframework.boot.autoconfigure.flyway.FlywayAutoConfiguration");
    beanDefinition.setInstanceSupplier(getFlywayDefaultDdlModeProviderInstanceSupplier());
    return beanDefinition;
  }

  /**
   * Bean definitions for {@link FlywayAutoConfiguration.FlywayConfiguration}.
   */
  @Generated
  public static class FlywayConfiguration {
    /**
     * Get the bean instance supplier for 'org.springframework.boot.autoconfigure.flyway.FlywayAutoConfiguration$FlywayConfiguration'.
     */
    private static BeanInstanceSupplier<FlywayAutoConfiguration.FlywayConfiguration> getFlywayConfigurationInstanceSupplier(
        ) {
      return BeanInstanceSupplier.<FlywayAutoConfiguration.FlywayConfiguration>forConstructor(FlywayProperties.class)
              .withGenerator((registeredBean, args) -> new FlywayAutoConfiguration.FlywayConfiguration(args.get(0)));
    }

    /**
     * Get the bean definition for 'flywayConfiguration'.
     */
    public static BeanDefinition getFlywayConfigurationBeanDefinition() {
      RootBeanDefinition beanDefinition = new RootBeanDefinition(FlywayAutoConfiguration.FlywayConfiguration.class);
      beanDefinition.setInstanceSupplier(getFlywayConfigurationInstanceSupplier());
      return beanDefinition;
    }

    /**
     * Get the bean instance for 'resourceProviderCustomizer'.
     */
    private static NativeImageResourceProviderCustomizer getResourceProviderCustomizerInstance() {
      return new NativeImageResourceProviderCustomizer();
    }

    /**
     * Get the bean definition for 'resourceProviderCustomizer'.
     */
    public static BeanDefinition getResourceProviderCustomizerBeanDefinition() {
      RootBeanDefinition beanDefinition = new RootBeanDefinition(ResourceProviderCustomizer.class);
      beanDefinition.setFactoryBeanName("org.springframework.boot.autoconfigure.flyway.FlywayAutoConfiguration$FlywayConfiguration");
      beanDefinition.setInstanceSupplier(FlywayConfiguration::getResourceProviderCustomizerInstance);
      return beanDefinition;
    }

    /**
     * Get the bean instance supplier for 'flywayConnectionDetails'.
     */
    private static BeanInstanceSupplier<FlywayAutoConfiguration.PropertiesFlywayConnectionDetails> getFlywayConnectionDetailsInstanceSupplier(
        ) {
      return BeanInstanceSupplier.<FlywayAutoConfiguration.PropertiesFlywayConnectionDetails>forFactoryMethod(FlywayAutoConfiguration.FlywayConfiguration.class, "flywayConnectionDetails")
              .withGenerator((registeredBean) -> registeredBean.getBeanFactory().getBean("org.springframework.boot.autoconfigure.flyway.FlywayAutoConfiguration$FlywayConfiguration", FlywayAutoConfiguration.FlywayConfiguration.class).flywayConnectionDetails());
    }

    /**
     * Get the bean definition for 'flywayConnectionDetails'.
     */
    public static BeanDefinition getFlywayConnectionDetailsBeanDefinition() {
      RootBeanDefinition beanDefinition = new RootBeanDefinition(FlywayAutoConfiguration.PropertiesFlywayConnectionDetails.class);
      beanDefinition.setFactoryBeanName("org.springframework.boot.autoconfigure.flyway.FlywayAutoConfiguration$FlywayConfiguration");
      beanDefinition.setInstanceSupplier(getFlywayConnectionDetailsInstanceSupplier());
      return beanDefinition;
    }

    /**
     * Get the bean instance supplier for 'postgresqlFlywayConfigurationCustomizer'.
     */
    private static BeanInstanceSupplier<FlywayAutoConfiguration.PostgresqlFlywayConfigurationCustomizer> getPostgresqlFlywayConfigurationCustomizerInstanceSupplier(
        ) {
      return BeanInstanceSupplier.<FlywayAutoConfiguration.PostgresqlFlywayConfigurationCustomizer>forFactoryMethod(FlywayAutoConfiguration.FlywayConfiguration.class, "postgresqlFlywayConfigurationCustomizer")
              .withGenerator((registeredBean) -> registeredBean.getBeanFactory().getBean("org.springframework.boot.autoconfigure.flyway.FlywayAutoConfiguration$FlywayConfiguration", FlywayAutoConfiguration.FlywayConfiguration.class).postgresqlFlywayConfigurationCustomizer());
    }

    /**
     * Get the bean definition for 'postgresqlFlywayConfigurationCustomizer'.
     */
    public static BeanDefinition getPostgresqlFlywayConfigurationCustomizerBeanDefinition() {
      RootBeanDefinition beanDefinition = new RootBeanDefinition(FlywayAutoConfiguration.PostgresqlFlywayConfigurationCustomizer.class);
      beanDefinition.setFactoryBeanName("org.springframework.boot.autoconfigure.flyway.FlywayAutoConfiguration$FlywayConfiguration");
      beanDefinition.setInstanceSupplier(getPostgresqlFlywayConfigurationCustomizerInstanceSupplier());
      return beanDefinition;
    }

    /**
     * Get the bean instance supplier for 'flyway'.
     */
    private static BeanInstanceSupplier<Flyway> getFlywayInstanceSupplier() {
      return BeanInstanceSupplier.<Flyway>forFactoryMethod(FlywayAutoConfiguration.FlywayConfiguration.class, "flyway", FlywayConnectionDetails.class, ResourceLoader.class, ObjectProvider.class, ObjectProvider.class, ObjectProvider.class, ObjectProvider.class, ObjectProvider.class, ResourceProviderCustomizer.class)
              .withGenerator((registeredBean, args) -> registeredBean.getBeanFactory().getBean("org.springframework.boot.autoconfigure.flyway.FlywayAutoConfiguration$FlywayConfiguration", FlywayAutoConfiguration.FlywayConfiguration.class).flyway(args.get(0), args.get(1), args.get(2), args.get(3), args.get(4), args.get(5), args.get(6), args.get(7)));
    }

    /**
     * Get the bean definition for 'flyway'.
     */
    public static BeanDefinition getFlywayBeanDefinition() {
      RootBeanDefinition beanDefinition = new RootBeanDefinition(Flyway.class);
      beanDefinition.setFactoryBeanName("org.springframework.boot.autoconfigure.flyway.FlywayAutoConfiguration$FlywayConfiguration");
      beanDefinition.setInstanceSupplier(getFlywayInstanceSupplier());
      return beanDefinition;
    }

    /**
     * Get the bean instance supplier for 'flywayInitializer'.
     */
    private static BeanInstanceSupplier<FlywayMigrationInitializer> getFlywayInitializerInstanceSupplier(
        ) {
      return BeanInstanceSupplier.<FlywayMigrationInitializer>forFactoryMethod(FlywayAutoConfiguration.FlywayConfiguration.class, "flywayInitializer", Flyway.class, ObjectProvider.class)
              .withGenerator((registeredBean, args) -> registeredBean.getBeanFactory().getBean("org.springframework.boot.autoconfigure.flyway.FlywayAutoConfiguration$FlywayConfiguration", FlywayAutoConfiguration.FlywayConfiguration.class).flywayInitializer(args.get(0), args.get(1)));
    }

    /**
     * Get the bean definition for 'flywayInitializer'.
     */
    public static BeanDefinition getFlywayInitializerBeanDefinition() {
      RootBeanDefinition beanDefinition = new RootBeanDefinition(FlywayMigrationInitializer.class);
      beanDefinition.setDependsOn("flyway");
      beanDefinition.setFactoryBeanName("org.springframework.boot.autoconfigure.flyway.FlywayAutoConfiguration$FlywayConfiguration");
      beanDefinition.setInstanceSupplier(getFlywayInitializerInstanceSupplier());
      return beanDefinition;
    }
  }
}
