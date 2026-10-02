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
}
