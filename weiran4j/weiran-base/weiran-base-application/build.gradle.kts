plugins {
    id("com.weiran.spring-conventions")
}

description = "weiran-base 应用层：用例编排、事务边界，含 TokenAuthenticator 与 OperationLogRecorder（独立线程池异步落库）实现。依赖领域端口，不依赖持久化实现。"

weiranConventions {
    // 用例编排的正确性要连着真库才有意义，由 weiran-app 的 Testcontainers 集成测试覆盖，
    // 覆盖率在 weiran-app 里跨模块聚合考核（见 weiran-app/build.gradle.kts）。
    jacocoVerificationEnabled = false
}

dependencies {
    api(project(":weiran-base-api"))
    api(project(":weiran-base-domain"))
    api(project(":weiran-framework"))
    implementation("com.github.ben-manes.caffeine:caffeine")
}
