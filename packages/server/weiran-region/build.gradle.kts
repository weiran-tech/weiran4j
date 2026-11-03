plugins {
    id("com.wulicode.weiran.java-conventions")
}

description = "weiran-region 下游入口：编译时仅暴露行政区划 API，运行时装配 HTTP 适配与持久化迁移。"

dependencies {
    api(project(":weiran-region-api"))
    runtimeOnly(project(":weiran-region-adapter"))
    runtimeOnly(project(":weiran-region-infrastructure"))
}
