plugins {
    `java-platform`
    `maven-publish`
}

javaPlatform {
    allowDependencies()
}

/**
 * 本仓统一依赖平台，也是全仓**唯一**出现第三方版本号的地方。
 *
 * 版本来源分两层：
 * 1. import 两个上游 BOM —— Spring Boot（Spring、Jackson、Caffeine、Flyway、MySQL 驱动、
 *    Testcontainers、JUnit、AssertJ、Lombok 等）与 MyBatis-Plus（各子模块互相对齐）；
 * 2. 上游 BOM 都不管的依赖（jjwt、springdoc、forbiddenapis 注解）在 constraints 里钉版本。
 */
dependencies {
    api(platform("org.springframework.boot:spring-boot-dependencies:3.5.15"))
    // 3.5.9 起分页插件拆到 mybatis-plus-jsqlparser；3.5.17 的 boot3 starter 与 Spring Boot 3.5 兼容。
    api(platform("com.baomidou:mybatis-plus-bom:3.5.17"))

    constraints {
        // 本仓模块，供未来外部消费方无版本引入。
        api("com.weiran:weiran-common:${project.version}")
        api("com.weiran:weiran-framework:${project.version}")
        listOf("weiran-system", "weiran-platform").forEach { module ->
            listOf("api", "domain", "application", "infrastructure", "adapter").forEach { layer ->
                api("com.weiran:$module-$layer:${project.version}")
            }
        }

        // JWT：Spring Boot BOM 不含 jjwt。
        api("io.jsonwebtoken:jjwt-api:0.13.0")
        api("io.jsonwebtoken:jjwt-impl:0.13.0")
        api("io.jsonwebtoken:jjwt-jackson:0.13.0")

        // OpenAPI 文档：2.8.x 对应 Spring Boot 3.5。
        api("org.springdoc:springdoc-openapi-starter-webmvc-ui:2.8.17")

        // Forbidden APIs 的 @SuppressForbidden 注解。仅编译期可见，用于在无法回避的
        // 第三方 API 边界（JJWT 只接受 java.util.Date）做精确豁免，版本与 build-logic 里的插件一致。
        api("de.thetaphi:forbiddenapis:3.10")
    }
}

publishing {
    publications {
        create<MavenPublication>("mavenBom") {
            from(components["javaPlatform"])
            pom {
                name.set("weiran-dependencies")
                description.set("weiran4j 统一依赖平台：聚合 Spring Boot 与 MyBatis-Plus BOM 及本仓组件版本。")
            }
        }
    }
}
