package com.weiran.gradle

import org.gradle.api.Project

/**
 * 约定插件的可调开关。
 *
 * 全局默认值在这里；需要调整时在根 `gradle.properties` 或 `-P` 参数里覆盖，模块级差异
 * 走 `weiranConventions {}`（见 [WeiranConventionsExtension]），不要在模块 build 脚本里重复配置质量规则。
 */
internal object ConventionProperties {
    const val DEFAULT_BOM_COORDINATES = "com.weiran:weiran-dependencies:0.1.0-SNAPSHOT"
    const val DEFAULT_JACOCO_LINE_MINIMUM = "0.45"
    const val DEFAULT_JAVA_VERSION = 21
    const val DEFAULT_NULL_AWAY_ANNOTATED_PACKAGES = "com.weiran"
    const val DEFAULT_PALANTIR_JAVA_FORMAT_VERSION = "2.97.0"
    const val DEFAULT_PROJECT_BOM_PATH = ":weiran-dependencies"

    const val BOM_COORDINATES = "weiran.conventions.bom-coordinates"
    const val FORBIDDEN_APIS_ENABLED = "weiran.conventions.forbidden-apis.enabled"
    const val FORBIDDEN_APIS_TEST_ENABLED = "weiran.conventions.forbidden-apis.test-enabled"
    const val JACOCO_LINE_MINIMUM = "weiran.conventions.jacoco.line.minimum"
    const val JACOCO_VERIFICATION_ENABLED = "weiran.conventions.jacoco.verification.enabled"
    const val JAVA_VERSION = "weiran.conventions.java-version"
    const val LOMBOK_ENABLED = "weiran.conventions.lombok.enabled"
    const val NULL_AWAY_ANNOTATED_PACKAGES = "weiran.conventions.nullaway.annotated-packages"
    const val NULL_AWAY_ENABLED = "weiran.conventions.nullaway.enabled"
    const val NULL_AWAY_JSPECIFY = "weiran.conventions.nullaway.jspecify"
    const val PALANTIR_JAVA_FORMAT_VERSION = "weiran.conventions.palantir-java-format.version"
    const val PROJECT_BOM_PATH = "weiran.conventions.project-bom-path"
    const val SPOTBUGS_ENABLED = "weiran.conventions.spotbugs.enabled"
    const val SPOTLESS_ENABLED = "weiran.conventions.spotless.enabled"
    const val USE_PROJECT_BOM = "weiran.conventions.use-project-bom"
}

internal fun Project.stringProperty(name: String, defaultValue: String): String =
    providers.gradleProperty(name).orElse(defaultValue).get()

internal fun Project.booleanProperty(name: String, defaultValue: Boolean): Boolean =
    providers.gradleProperty(name).map(String::toBooleanStrict).orElse(defaultValue).get()

internal fun Project.intProperty(name: String, defaultValue: Int): Int =
    providers.gradleProperty(name).map(String::toInt).orElse(defaultValue).get()
