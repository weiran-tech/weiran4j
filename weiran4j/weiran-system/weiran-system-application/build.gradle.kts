plugins {
    id("com.weiran.spring-conventions")
}

description = "weiran-system 应用层：用例编排、事务边界与 TokenAuthenticator 实现。依赖领域端口，不依赖持久化实现。"

weiranConventions {
    // 用例编排的正确性要连着真库才有意义，由 weiran-app 的 Testcontainers 集成测试覆盖，
    // 覆盖率在 weiran-app 里跨模块聚合考核（见 weiran-app/build.gradle.kts）。
    jacocoVerificationEnabled = false
}

dependencies {
    api(project(":weiran-system-api"))
    api(project(":weiran-system-domain"))
    api(project(":weiran-framework"))
    implementation("com.github.ben-manes.caffeine:caffeine")
}
