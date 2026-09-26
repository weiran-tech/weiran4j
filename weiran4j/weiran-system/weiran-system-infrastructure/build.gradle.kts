plugins {
    id("com.weiran.spring-conventions")
}

description = "weiran-system 基础设施层：MyBatis-Plus 持久化、JWT、BCrypt 与 Flyway 迁移脚本。"

weiranConventions {
    // Mapper 与仓储实现只有连着真 MySQL 才能验证，由 weiran-app 的集成测试覆盖并聚合考核。
    jacocoVerificationEnabled = false
}

dependencies {
    api(project(":weiran-system-domain"))
    implementation(project(":weiran-framework"))
    implementation("org.springframework.security:spring-security-crypto")
    implementation("io.jsonwebtoken:jjwt-api")
    // JJWT 的时间入参只接受 java.util.Date，而 Forbidden APIs 全局禁用它。
    // 这个依赖只为在那一处边界打 @SuppressForbidden，不放宽规则本身。
    compileOnly("de.thetaphi:forbiddenapis")
    runtimeOnly("io.jsonwebtoken:jjwt-impl")
    runtimeOnly("io.jsonwebtoken:jjwt-jackson")
}
