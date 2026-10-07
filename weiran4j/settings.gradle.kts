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
    "weiran-framework",
    "weiran-app",
)

// 业务模块的五层按目录聚在 weiran-<模块>/ 下，但项目路径保持扁平（:weiran-system-api）：
// 嵌套 include 会产生 :weiran-system:weiran-system-api 这种冗长路径，并凭空多出一个
// 没有构建脚本的中间项目。
//
// 业务模块靠目录自动发现（D-012）：weiran-<模块>/ 下有 weiran-<模块>-{五层} 子目录即算业务模块，
// 新增模块不改任何构建脚本——fork 跟随本仓的下游因此不用碰这个文件，同步上游时不会冲突。
// 一层都没有的（weiran-framework 等）不是业务模块；有其中几层却不齐的直接失败：
// 静默跳过会让半成品模块整个不参与构建，问题要到运行时才暴露。
val layers = listOf("api", "domain", "application", "infrastructure", "adapter")
val discoveredModules = rootDir
    .listFiles { file -> file.isDirectory && file.name.startsWith("weiran-") }
    .orEmpty()
    .filter { dir -> layers.any { layer -> dir.resolve("${dir.name}-$layer").isDirectory } }
    .map { dir ->
        val missing = layers.filterNot { layer -> dir.resolve("${dir.name}-$layer").isDirectory }
        require(missing.isEmpty()) {
            "业务模块 ${dir.name} 五层不齐，缺少：${missing.joinToString { "${dir.name}-$it" }}。" +
                "补齐这些目录，或删掉已建的层目录。"
        }
        dir.name
    }
// weiran-system 是基座，固定排第一；其余按名称排序，保证构建顺序与报告稳定。
val businessModules = discoveredModules.filter { it == "weiran-system" } +
    discoveredModules.filter { it != "weiran-system" }.sorted()

// 供 weiran-dependencies（BOM 坐标）与 weiran-app（依赖与覆盖率聚合）读取，模块清单只在这里算一次。
gradle.extra["weiran.businessModules"] = businessModules

businessModules.forEach { module ->
    layers.forEach { layer ->
        val name = "$module-$layer"
        include(name)
        project(":$name").projectDir = file("$module/$name")
    }
}
