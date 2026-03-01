package com.vollos.core.feature;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Gates a controller or method to tenants that have subscribed to the specified feature.
 * Enforced by {@link FeatureAccessInterceptor}.
 */
@Target({ElementType.TYPE, ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
public @interface RequiresFeature {
    /** The feature ID, e.g. "customsguard" */
    String value();
}
