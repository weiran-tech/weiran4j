package com.weiran.gradle

import org.gradle.api.provider.Property

/**
 * 模块级约定开关。
 *
 * <p>存在的理由：Gradle **不读取子项目的 `gradle.properties`**，`weiran.conventions.*`
 * 只能在根项目或 GRADLE_USER_HOME 生效，也就是只能全仓一刀切。而放宽规则天然是模块级决定
 * （某个模块没有业务逻辑、某个模块在对接遗留系统），需要一个模块能表达、
 * 又不让模块自己去碰任务配置的入口——那正是 CP-5 要防的事。
 *
 * 用法：
 * ```
 * weiranConventions {
 *     jacocoVerificationEnabled = false // 并在紧邻位置写明理由
 * }
 * ```
 */
abstract class WeiranConventionsExtension {

    /** 是否对本模块执行覆盖率门禁。默认取全局 `weiran.conventions.jacoco.verification.enabled`。 */
    abstract val jacocoVerificationEnabled: Property<Boolean>

    /** 本模块的行覆盖率下限。默认取全局 `weiran.conventions.jacoco.line.minimum`。 */
    abstract val jacocoLineMinimum: Property<String>
}
