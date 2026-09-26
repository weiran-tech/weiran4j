@file:Suppress("UnstableApiUsage")

pluginManagement {
    includeBuild("build-logic")
    repositories {
        gradlePluginPortal()
        mavenCentral()
    }
}

dependencyResolutionManagement {
    // 禁止模块级 repositories：仓库声明只有这一处，避免各模块各自加源导致解析结果不可复现。
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        mavenCentral()
    }
}

rootProject.name = "weiran4j"

include(
    "weiran-dependencies",
    "weiran-common",
    "weiran-framework",
    "weiran-app",
)

// 业务模块的五层按目录聚在 weiran-<模块>/ 下，但项目路径保持扁平（:weiran-system-api）：
// 嵌套 include 会产生 :weiran-system:weiran-system-api 这种冗长路径，并凭空多出一个
// 没有构建脚本的中间项目。新增业务模块时在 businessModules 里追加模块名即可。
val businessModules = listOf("weiran-system", "weiran-platform")
val layers = listOf("api", "domain", "application", "infrastructure", "adapter")

businessModules.forEach { module ->
    layers.forEach { layer ->
        val name = "$module-$layer"
        include(name)
        project(":$name").projectDir = file("$module/$name")
    }
}
