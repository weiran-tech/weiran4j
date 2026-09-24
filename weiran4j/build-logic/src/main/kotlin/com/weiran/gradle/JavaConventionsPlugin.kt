package com.weiran.gradle

import java.math.BigDecimal
import org.gradle.api.Plugin
import org.gradle.api.Project
import org.gradle.api.artifacts.dsl.DependencyHandler
import org.gradle.api.plugins.JavaPluginExtension
import org.gradle.api.tasks.compile.JavaCompile
import org.gradle.api.tasks.testing.Test
import org.gradle.jvm.toolchain.JavaLanguageVersion
import org.gradle.kotlin.dsl.configure
import org.gradle.kotlin.dsl.create
import org.gradle.kotlin.dsl.dependencies
import org.gradle.kotlin.dsl.withType
import org.gradle.testing.jacoco.plugins.JacocoPluginExtension
import org.gradle.testing.jacoco.tasks.JacocoCoverageVerification
import org.gradle.testing.jacoco.tasks.JacocoReport

/**
 * 普通 Java 库模块的基线约定。
 *
 * 统一 toolchain、编译参数、BOM 平台、Lombok、测试栈与覆盖率门禁，
 * 并把质量插件一并挂上，使模块 build 脚本只声明业务依赖。
 */
class JavaConventionsPlugin : Plugin<Project> {
    override fun apply(project: Project) {
        with(project) {
            pluginManager.apply("java-library")
            pluginManager.apply("jacoco")
            pluginManager.apply("com.weiran.quality-conventions")

            val javaVersion = intProperty(
                ConventionProperties.JAVA_VERSION,
                ConventionProperties.DEFAULT_JAVA_VERSION,
            )
            val lombokEnabled = booleanProperty(ConventionProperties.LOMBOK_ENABLED, true)
            val jacocoVerificationEnabled = booleanProperty(
                ConventionProperties.JACOCO_VERIFICATION_ENABLED,
                true,
            )
            val jacocoLineMinimum = stringProperty(
                ConventionProperties.JACOCO_LINE_MINIMUM,
                ConventionProperties.DEFAULT_JACOCO_LINE_MINIMUM,
            )

            // 全局属性作为约定值，模块可在自己的 build 脚本里覆盖（见 WeiranConventionsExtension）。
            val conventions = extensions.create<WeiranConventionsExtension>("weiranConventions")
            conventions.jacocoVerificationEnabled.convention(jacocoVerificationEnabled)
            conventions.jacocoLineMinimum.convention(jacocoLineMinimum)

            extensions.configure<JavaPluginExtension> {
                toolchain {
                    languageVersion.set(JavaLanguageVersion.of(javaVersion))
                }
                withSourcesJar()
            }

            extensions.configure<JacocoPluginExtension> {
                toolVersion = "0.8.13"
            }

            tasks.withType<JavaCompile>().configureEach {
                options.encoding = "UTF-8"
                options.compilerArgs.addAll(
                    listOf(
                        "-parameters",
                        "-Xlint:all",
                        "-Xlint:-processing",
                    ),
                )
            }

            tasks.withType<Test>().configureEach {
                useJUnitPlatform()
            }

            tasks.withType<JacocoReport>().configureEach {
                dependsOn(tasks.withType<Test>())
                reports {
                    xml.required.set(true)
                    html.required.set(true)
                    csv.required.set(false)
                }
            }

            tasks.withType<JacocoCoverageVerification>().configureEach {
                // configureEach 在模块脚本求值之后才实现任务，因此这里读到的是模块覆盖后的值。
                enabled = conventions.jacocoVerificationEnabled.get()
                dependsOn(tasks.withType<Test>())
                violationRules {
                    rule {
                        limit {
                            counter = "LINE"
                            value = "COVEREDRATIO"
                            minimum = BigDecimal(conventions.jacocoLineMinimum.get())
                        }
                    }
                }
            }

            tasks.named("check").configure {
                dependsOn(tasks.withType<JacocoReport>())
                dependsOn(tasks.withType<JacocoCoverageVerification>())
            }

            dependencies {
                val bomDependency = conventionBomDependency()
                "implementation"(platform(bomDependency))
                "testImplementation"(platform(bomDependency))
                "annotationProcessor"(platform(bomDependency))
                "testAnnotationProcessor"(platform(bomDependency))
                slf4jApi()
                if (lombokEnabled) {
                    lombok()
                }
                "testImplementation"("org.junit.jupiter:junit-jupiter")
                "testRuntimeOnly"("org.junit.platform:junit-platform-launcher")
                "testImplementation"("org.assertj:assertj-core")
            }
        }
    }

    /**
     * 本仓模块统一走仓内 BOM 工程依赖；外部消费方通过坐标引入。
     */
    private fun Project.conventionBomDependency(): Any {
        val useProjectBom = booleanProperty(ConventionProperties.USE_PROJECT_BOM, false)
        if (useProjectBom) {
            val projectBomPath = stringProperty(
                ConventionProperties.PROJECT_BOM_PATH,
                ConventionProperties.DEFAULT_PROJECT_BOM_PATH,
            )
            return dependencies.project(mapOf("path" to projectBomPath))
        }

        return stringProperty(
            ConventionProperties.BOM_COORDINATES,
            ConventionProperties.DEFAULT_BOM_COORDINATES,
        )
    }

    private fun DependencyHandler.lombok() {
        add("compileOnly", "org.projectlombok:lombok")
        add("annotationProcessor", "org.projectlombok:lombok")
        add("testCompileOnly", "org.projectlombok:lombok")
        add("testAnnotationProcessor", "org.projectlombok:lombok")
    }

    private fun DependencyHandler.slf4jApi() {
        add("implementation", "org.slf4j:slf4j-api")
        add("testImplementation", "org.slf4j:slf4j-api")
    }
}
