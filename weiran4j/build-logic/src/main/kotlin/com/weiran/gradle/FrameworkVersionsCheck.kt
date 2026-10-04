package com.weiran.gradle

import org.gradle.api.GradleException
import org.gradle.api.Project
import org.gradle.api.artifacts.Dependency
import org.gradle.api.artifacts.ModuleDependency
import org.gradle.api.artifacts.component.ModuleComponentIdentifier
import org.gradle.api.artifacts.result.ResolutionResult

/**
 * 框架依赖版本防护（D-013，宪法 CP-4）：`verifyFrameworkVersions`，挂在可执行应用的 `check` 上。
 *
 * fork 下游可以在 `weiran-dependencies/biz-dependencies.gradle.kts` 登记业务依赖版本。Gradle 对 `platform`
 * 的版本冲突取高，于是下游一钉版本、或某个业务库的传递依赖要了更高版本，Spring / Jackson 等框架依赖就会被
 * 悄悄升级——编译、测试照样全绿。这里把两份版本放在一起比：
 *
 * - **框架版本**：只用上游 BOM 的框架层（两个 BOM + 上游 constraints，由 `weiran-dependencies` 在 apply 下游清单
 *   之前快照到 extra）单独解析每个模块，能解析出版本的就是「框架已管理」；
 * - **实际版本**：本模块 `runtimeClasspath` 最终选中的版本。
 *
 * 判定：下游清单直接约束框架已管理的模块 → 失败（不论高低，钉低会被 Gradle 静默忽略，不可豁免）；
 * 实际 ≠ 框架且不在白名单 → 失败；白名单理由为空 → 失败；白名单条目已不再漂移 → 只告警。
 *
 * 任务在执行期读取另一个项目的 extra，依赖「不开配置缓存」（D-006）。
 */
internal object FrameworkVersionsCheck {
    const val TASK_NAME = "verifyFrameworkVersions"

    private const val FRAMEWORK_PLATFORMS = "weiran.frameworkPlatforms"
    private const val FRAMEWORK_CONSTRAINTS = "weiran.frameworkConstraints"
    private const val BIZ_CONSTRAINT_MODULES = "weiran.bizConstraintModules"
    private const val ALLOWLIST = "weiran.versionDriftAllowlist"
    private const val BIZ_ALLOWLIST = "weiran.bizVersionDriftAllowlist"

    fun register(project: Project) {
        // 捕获 Project 引用而不是在执行期调用 Task.project。
        val target = project
        val task = project.tasks.register(TASK_NAME) {
            group = "verification"
            description = "检查运行时类路径里的框架依赖没有被下游清单或传递依赖拉离框架版本（D-013）。"
            doLast { verify(target) }
        }
        project.tasks.named("check").configure { dependsOn(task) }
    }

    private fun verify(project: Project) {
        val bomPath = project.stringProperty(
            ConventionProperties.PROJECT_BOM_PATH,
            ConventionProperties.DEFAULT_PROJECT_BOM_PATH,
        )
        val bom = project.rootProject.findProject(bomPath)
        val extra = bom?.extensions?.extraProperties
        if (extra == null || !extra.has(FRAMEWORK_PLATFORMS)) {
            project.logger.warn("$TASK_NAME: 找不到 $bomPath 的框架层快照（$FRAMEWORK_PLATFORMS），跳过检查")
            return
        }
        val platforms = extra.stringList(FRAMEWORK_PLATFORMS)
        val frameworkConstraints = extra.stringList(FRAMEWORK_CONSTRAINTS)
        val bizConstraintModules = extra.stringList(BIZ_CONSTRAINT_MODULES)
        val allowlist = extra.stringMap(ALLOWLIST) + extra.stringMap(BIZ_ALLOWLIST)

        val actual = project.configurations.getByName("runtimeClasspath").incoming.resolutionResult.moduleVersions()
        val managed = frameworkVersions(project, platforms, frameworkConstraints, actual.keys + bizConstraintModules)

        val failures = mutableListOf<String>()
        allowlist.filterValues { it.isBlank() }.keys.sorted().forEach {
            failures += "白名单 $it 没有写理由：每条豁免都要说明为什么可以接受（CP-6）"
        }
        bizConstraintModules.filter { it in managed }.forEach {
            failures += "下游清单 biz-dependencies.gradle.kts 约束了框架已管理的 $it（框架版本 ${managed[it]}）：" +
                "删掉这条约束。下游不得改框架依赖的版本，往高会悄悄升级框架，往低会被 Gradle 静默忽略"
        }
        actual.toSortedMap().forEach { (module, version) ->
            val frameworkVersion = managed[module]
            if (frameworkVersion != null && frameworkVersion != version && module !in allowlist) {
                failures += "$module 框架版本 $frameworkVersion，实际 $version：用 " +
                    "`./gradlew ${project.path}:dependencyInsight --dependency $module --configuration runtimeClasspath` 查来源；" +
                    "确认可接受时在下游清单的 extra[\"$BIZ_ALLOWLIST\"] 里登记并写理由"
            }
        }
        allowlist.keys.sorted()
            .filter { managed[it] == null || actual[it] == null || managed[it] == actual[it] }
            .forEach { project.logger.warn("$TASK_NAME: 白名单 $it 已不再漂移，可以删掉") }

        if (failures.isNotEmpty()) {
            throw GradleException(
                "框架依赖版本检查失败（D-013）：\n" + failures.joinToString("\n") { "  - $it" },
            )
        }
        project.logger.lifecycle(
            "$TASK_NAME: 运行时模块 ${actual.size} 个，其中框架已管理 ${actual.keys.count { it in managed }} 个，" +
                "白名单豁免 ${allowlist.size} 条",
        )
    }

    /**
     * 只用框架层解析出每个模块的框架版本。
     *
     * 平台依赖必须保持传递——BOM 的约束挂在它的传递边上，整个配置设成非传递会把约束一起切掉；
     * 被查询的模块逐个设成非传递，避免它们的传递依赖反过来把版本抬高。解析不出版本的模块框架不管，不出现在结果里。
     */
    private fun frameworkVersions(
        project: Project,
        platforms: List<String>,
        constraints: List<String>,
        modules: Set<String>,
    ): Map<String, String> {
        val requests: List<Dependency> = platforms.map { project.dependencies.platform(it) } +
            modules.sorted().map { module ->
                (project.dependencies.create(module) as ModuleDependency).apply { isTransitive = false }
            }
        val detached = project.configurations.detachedConfiguration(*requests.toTypedArray())
        constraints.forEach { detached.dependencyConstraints.add(project.dependencies.constraints.create(it)) }
        return detached.incoming.resolutionResult.moduleVersions().filterKeys { it in modules }
    }

    private fun ResolutionResult.moduleVersions(): Map<String, String> =
        allComponents
            .mapNotNull { it.id as? ModuleComponentIdentifier }
            .associate { "${it.group}:${it.module}" to it.version }

    @Suppress("UNCHECKED_CAST") // weiran-dependencies 写入的就是这些类型；extra 只能按 Any? 取出。
    private fun org.gradle.api.plugins.ExtraPropertiesExtension.stringList(key: String): List<String> =
        if (has(key)) get(key) as List<String> else emptyList()

    @Suppress("UNCHECKED_CAST") // 同上。
    private fun org.gradle.api.plugins.ExtraPropertiesExtension.stringMap(key: String): Map<String, String> =
        if (has(key)) get(key) as Map<String, String> else emptyMap()
}
