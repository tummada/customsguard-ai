plugins {
    id("org.springframework.boot")
    id("org.graalvm.buildtools.native")
}

dependencies {
    implementation(project(":platform-core"))
    implementation("org.springframework.boot:spring-boot-starter-actuator")

    // Feature modules - add one line per vertical
    runtimeOnly(project(":feature-customsguard"))
}

graalvmNative {
    binaries {
        named("main") {
            buildArgs.addAll(
                "--initialize-at-build-time",
                "-H:+ReportExceptionStackTraces"
            )
        }
    }
}

tasks.named<org.springframework.boot.gradle.tasks.bundling.BootJar>("bootJar") {
    archiveBaseName.set("vollos-backend")
}
