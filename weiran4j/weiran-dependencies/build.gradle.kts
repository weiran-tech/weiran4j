plugins {
    `java-platform`
    `maven-publish`
}

javaPlatform {
    allowDependencies()
}

/**
 * 本仓统一依赖平台。**框架**的第三方版本只在这里出现；fork 下游的**业务**版本只在下游独占的
 * `biz-dependencies.gradle.kts` 出现（D-013，宪法 CP-4）。
 *
 * 框架版本来源分两层：
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
        // 业务模块清单由 settings.gradle.kts 按目录发现（D-012），这里不再手写。
        @Suppress("UNCHECKED_CAST") // settings 写入的就是 List<String>；gradle.extra 只能按 Any? 取出。
        val businessModules = gradle.extra["weiran.businessModules"] as List<String>
        businessModules.forEach { module ->
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

// ── 框架层快照 ──────────────────────────────────────────────────────────────
// 上面声明的就是「框架管理」的全部版本来源。在 apply 下游清单之前记下来，供 build-logic 的
// verifyFrameworkVersions 用它单独解析出框架版本，再与运行时类路径的实际版本比对。
val apiDeclarations = configurations.api.get()
extra["weiran.frameworkPlatforms"] = apiDeclarations.dependencies
    .withType<ExternalModuleDependency>()
    .map { "${it.group}:${it.name}:${it.version}" }
extra["weiran.frameworkConstraints"] = apiDeclarations.dependencyConstraints
    .filter { it.group != "com.weiran" }
    .map { "${it.group}:${it.name}:${it.version}" }

// 框架依赖被传递依赖拉离框架版本、且确认可接受的，逐条写在这里，理由必填（CP-6）。
// 不再漂移的条目会被检查任务报 warning，届时删掉。
extra["weiran.versionDriftAllowlist"] = mapOf(
    "org.yaml:snakeyaml" to
        "Spring Boot BOM 自带的 jackson-dataformat-yaml 2.21.4 需要 2.5，BOM 仍管 2.4；属 Spring Boot 自身不一致",
    "org.apache.commons:commons-lang3" to
        "springdoc 的 swagger-core-jakarta 需要 3.20.0，BOM 管 3.17.0；只影响 OpenAPI 文档（默认关闭）",
)

// ── 下游依赖清单（D-013）────────────────────────────────────────────────────
// fork 下游在这个文件里登记业务依赖版本与第三方 BOM，上游永不创建它。
// 记下它新增了哪些约束：下游不得约束框架已管理的依赖，由 verifyFrameworkVersions 判定。
val bizDependencies = file("biz-dependencies.gradle.kts")
// 按约束对象而不是坐标求差：下游对上游已钉的模块（如 jjwt）再钉一次，坐标相同但仍是下游新增的约束。
val frameworkConstraintObjects = apiDeclarations.dependencyConstraints.toSet()
if (bizDependencies.exists()) {
    apply(from = bizDependencies)
}
extra["weiran.bizConstraintModules"] = apiDeclarations.dependencyConstraints
    .filter { it !in frameworkConstraintObjects }
    .map { "${it.group}:${it.name}" }
    .distinct()
    .sorted()

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
