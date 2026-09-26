plugins {
    `kotlin-dsl`
}

group = "com.weiran.gradle"
version = providers.gradleProperty("weiran.build-logic.version").get()

dependencies {
    // 质量工具链插件版本只在这里声明；升级时同步检查 QualityConventionsPlugin 里的工具版本。
    implementation("com.github.spotbugs.snom:spotbugs-gradle-plugin:6.5.8")
    implementation("com.diffplug.spotless:com.diffplug.spotless.gradle.plugin:8.9.0")
    implementation("de.thetaphi:forbiddenapis:3.10")
    implementation("net.ltgt.gradle:gradle-errorprone-plugin:5.1.0")
    implementation("org.springframework.boot:spring-boot-gradle-plugin:3.5.15")
}

repositories {
    gradlePluginPortal()
    mavenCentral()
}

gradlePlugin {
    plugins {
        register("javaConventions") {
            id = "com.weiran.java-conventions"
            implementationClass = "com.weiran.gradle.JavaConventionsPlugin"
        }
        register("qualityConventions") {
            id = "com.weiran.quality-conventions"
            implementationClass = "com.weiran.gradle.QualityConventionsPlugin"
        }
        register("springConventions") {
            id = "com.weiran.spring-conventions"
            implementationClass = "com.weiran.gradle.SpringConventionsPlugin"
        }
        register("bootAppConventions") {
            id = "com.weiran.boot-app-conventions"
            implementationClass = "com.weiran.gradle.BootAppConventionsPlugin"
        }
    }
}
