package com.weiran.gradle

import org.gradle.api.Plugin
import org.gradle.api.Project
import org.gradle.api.tasks.bundling.Jar
import org.gradle.kotlin.dsl.named
import org.springframework.boot.gradle.tasks.bundling.BootJar

/**
 * 可执行应用模块约定。
 *
 * Spring Boot 插件只应用在这一类模块上：应用到库模块会让 `jar` 产出被 `bootJar` 顶替，
 * 其他模块以 project 依赖引它时拿到的是不可用的 fat jar。
 * 同时关掉库形态的 sourcesJar 之外的发布语义——应用是部署产物，不是被依赖的组件。
 */
class BootAppConventionsPlugin : Plugin<Project> {
    override fun apply(project: Project) {
        with(project) {
            pluginManager.apply("com.weiran.spring-conventions")
            pluginManager.apply("org.springframework.boot")

            tasks.named<BootJar>("bootJar") {
                enabled = true
                archiveClassifier.set("")
            }

            // 应用模块不需要普通 jar 参与依赖解析，但保留任务存在以免 check 链路断开。
            tasks.named<Jar>("jar") {
                enabled = false
            }
        }
    }
}
