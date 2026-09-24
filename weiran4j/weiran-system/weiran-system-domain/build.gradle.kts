plugins {
    id("com.weiran.java-conventions")
}

description = "weiran-system 领域层：实体、值对象、领域服务与仓储端口。不依赖 Spring 与持久化框架。"

dependencies {
    api(project(":weiran-common"))
}
