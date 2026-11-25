plugins {
    id("com.wulicode.weiran.spring-conventions")
}

description = "可选组件演示：仅 local/test 使用的菜单、配置、批处理示例。"

weiranConventions {
    // 演示处理器由 weiran-app 的真实 worker/HTTP 集成测试覆盖，加入应用聚合覆盖率。
    jacocoVerificationEnabled = false
}

dependencies {
    implementation(project(":weiran-system-api"))
    implementation(project(":weiran-framework"))
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework:spring-jdbc")
    implementation("org.apache.poi:poi-ooxml")
}

// 同名历史迁移继续由 weiran-app 提供，避免 Flyway 在两个 jar 中发现重复版本。
sourceSets.main {
    resources.exclude("db/app-demo/**")
}
