plugins {
    id("com.weiran.java-conventions")
}

description = "weiran-system 对外契约：DTO、对外服务接口、错误码。不含任何实现与框架依赖。"

dependencies {
    api(project(":weiran-common"))
}
