package com.weiran.gradle

import org.gradle.api.Plugin
import org.gradle.api.Project
import org.gradle.kotlin.dsl.dependencies

/**
 * Spring 组件模块约定：库形态，不产出可执行 jar。
 *
 * 业务模块的五层（api / domain / application / infrastructure / adapter）都用这个插件；
 * 只有聚合启动模块用 [BootAppConventionsPlugin]。
 */
class SpringConventionsPlugin : Plugin<Project> {
    override fun apply(project: Project) {
        with(project) {
            pluginManager.apply("com.weiran.java-conventions")

            dependencies {
                "implementation"("org.springframework.boot:spring-boot-autoconfigure")
                "annotationProcessor"("org.springframework.boot:spring-boot-configuration-processor")
                "testImplementation"("org.springframework.boot:spring-boot-starter-test")
            }
        }
    }
}
