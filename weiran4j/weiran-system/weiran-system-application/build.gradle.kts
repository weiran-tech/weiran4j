plugins {
    id("com.weiran.spring-conventions")
}

description = "weiran-system 应用层：用例编排与事务边界。依赖领域端口，不依赖具体实现。"

dependencies {
    api(project(":weiran-system-api"))
    api(project(":weiran-system-domain"))
    implementation("org.springframework:spring-tx")
}
