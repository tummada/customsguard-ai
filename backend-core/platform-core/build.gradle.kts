plugins {
    `java-library`
}

dependencies {
    api("org.springframework.boot:spring-boot-starter-data-jpa")
    api("org.springframework.boot:spring-boot-starter-web")
    api("org.springframework.boot:spring-boot-starter-security")
    api("org.springframework.boot:spring-boot-starter-validation")
    api("org.springframework.boot:spring-boot-starter-data-redis")
    api("com.fasterxml.jackson.module:jackson-module-blackbird")
    api("org.flywaydb:flyway-core")
    api("org.flywaydb:flyway-database-postgresql")
    api("com.github.ben-manes.caffeine:caffeine")
    runtimeOnly("org.postgresql:postgresql")

    // JWT support
    api("io.jsonwebtoken:jjwt-api:0.12.6")
    runtimeOnly("io.jsonwebtoken:jjwt-impl:0.12.6")
    runtimeOnly("io.jsonwebtoken:jjwt-jackson:0.12.6")
}
