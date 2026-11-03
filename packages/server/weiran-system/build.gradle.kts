plugins {
    id("com.wulicode.weiran.java-conventions")
}

description = "weiran-system 下游入口：编译时暴露系统 API，运行时装配 HTTP 适配与持久化迁移。"

dependencies {
    api(project(":weiran-system-api"))
    runtimeOnly(project(":weiran-system-adapter"))
    runtimeOnly(project(":weiran-system-infrastructure"))
}
