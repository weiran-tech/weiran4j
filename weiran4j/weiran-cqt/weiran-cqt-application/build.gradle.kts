plugins {
    id("com.weiran.spring-conventions")
}

description = "weiran-cqt 应用层：用例编排与事务边界。依赖领域端口与基座的 weiran-system-api（CP-13），不依赖持久化实现。"

weiranConventions {
    // 由 weiran-app 的集成测试覆盖，覆盖率在 weiran-app 里跨模块聚合考核。
    jacocoVerificationEnabled = false
}

dependencies {
    api(project(":weiran-cqt-api"))
    api(project(":weiran-cqt-domain"))
    api(project(":weiran-framework"))
    implementation(project(":weiran-system-api"))
    // @Transactional 与 DataAccessException；framework 不再传递框架库（D-016）。
    implementation("org.springframework:spring-tx")
}
