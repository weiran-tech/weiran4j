plugins {
    id("com.weiran.spring-conventions")
}

description = "weiran-platform 应用层：用例编排、事务边界与 OperationLogRecorder 实现（独立线程池异步落库）。"

weiranConventions {
    // 用例编排的正确性要连着真库才有意义，由 weiran-app 的 Testcontainers 集成测试覆盖，
    // 覆盖率在 weiran-app 里跨模块聚合考核（见 weiran-app/build.gradle.kts）。
    jacocoVerificationEnabled = false
}

dependencies {
    api(project(":weiran-platform-api"))
    api(project(":weiran-platform-domain"))
    api(project(":weiran-framework"))
}
