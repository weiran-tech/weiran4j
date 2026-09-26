plugins {
    id("com.weiran.spring-conventions")
}

description = "weiran-system 适配层：HTTP Controller、请求 DTO 与校验、权限与操作日志注解。"

weiranConventions {
    // Controller 的价值在于「装配后的 HTTP 行为」，由 weiran-app 的集成测试覆盖并聚合考核。
    jacocoVerificationEnabled = false
}

dependencies {
    api(project(":weiran-system-application"))
}
