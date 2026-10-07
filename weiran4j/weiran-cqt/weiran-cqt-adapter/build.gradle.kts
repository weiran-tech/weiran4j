plugins {
    id("com.weiran.spring-conventions")
}

description = "weiran-cqt 适配层：后台 /api/cqt/** 与 uniapp 前台 /api-web/** 的 Controller、请求 DTO 与校验。"

weiranConventions {
    // Controller 的价值在于「装配后的 HTTP 行为」，由 weiran-app 的集成测试覆盖并聚合考核。
    jacocoVerificationEnabled = false
}

dependencies {
    api(project(":weiran-cqt-application"))
    // framework 不再传递框架库（D-016），Web 与校验自己声明。
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    // PortalExceptionAdvice 要识别 DuplicateKeyException（在 spring-tx 里）。
    implementation("org.springframework:spring-tx")
}
