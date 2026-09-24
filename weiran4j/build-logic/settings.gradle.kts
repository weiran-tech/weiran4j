pluginManagement {
    repositories {
        // build-logic 自身需要解析 Gradle 插件（kotlin-dsl 及其依赖）。
        gradlePluginPortal()
        mavenCentral()
    }
}

// 仅影响 included build 的显示名，不是业务模块引用的插件 ID。
rootProject.name = "build-logic"
