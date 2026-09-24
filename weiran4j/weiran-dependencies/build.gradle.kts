plugins {
    `java-platform`
    `maven-publish`
}

javaPlatform {
    allowDependencies()
}

/**
 * 本仓统一依赖平台。
 *
 * 版本来源分两层：能由 wuli3 底座 BOM 决定的一律不在这里复述（Spring Boot、MyBatis-Plus、
 * Lombok、JUnit、AssertJ、质量工具链等都已由 wuli3-dependencies 约束）；
 * 只有 weiran4j 自己引入、底座没有的依赖才在 constraints 里钉版本。
 */
dependencies {
    api(platform("com.kjs.wuli3:wuli3-dependencies:0.1.0-SNAPSHOT"))

    constraints {
        // 本仓模块，供未来外部消费方无版本引入。
        api("com.weiran:weiran-common:${project.version}")
        api("com.weiran:weiran-system-api:${project.version}")
        api("com.weiran:weiran-system-domain:${project.version}")
        api("com.weiran:weiran-system-application:${project.version}")
        api("com.weiran:weiran-system-infrastructure:${project.version}")
        api("com.weiran:weiran-system-adapter:${project.version}")

        // JWT：Spring Boot BOM 不含 jjwt，这里是本仓唯一的版本来源。
        api("io.jsonwebtoken:jjwt-api:0.13.0")
        api("io.jsonwebtoken:jjwt-impl:0.13.0")
        api("io.jsonwebtoken:jjwt-jackson:0.13.0")

        // Forbidden APIs 的 @SuppressForbidden 注解。仅编译期可见，用于在无法回避的
        // 第三方 API 边界（JJWT 只接受 java.util.Date）做精确豁免，版本与 build-logic 里的插件一致。
        api("de.thetaphi:forbiddenapis:3.10")

        // spring-security-crypto（BCrypt）、h2、mysql-connector-j 的版本由
        // spring-boot-dependencies:3.5.15 管理，不在此复述——复述一次就多一处会过期的事实。
    }
}

publishing {
    publications {
        create<MavenPublication>("mavenBom") {
            from(components["javaPlatform"])
            pom {
                name.set("weiran-dependencies")
                description.set("weiran4j 统一依赖平台，聚合 wuli3 底座 BOM 与本仓组件版本。")
            }
        }
    }
}
