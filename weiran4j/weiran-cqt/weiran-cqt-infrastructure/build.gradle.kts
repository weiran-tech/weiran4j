plugins {
    id("com.weiran.spring-conventions")
}

description = "weiran-cqt 基础设施层：MyBatis-Plus 持久化、前台账号 JWT / BCrypt、短信验证码存储与 db/migration/cqt/ 下的 Flyway 脚本（表前缀 cqt_）。"

weiranConventions {
    // Mapper 与仓储实现只有连着真 MySQL 才能验证，由 weiran-app 的集成测试覆盖并聚合考核。
    jacocoVerificationEnabled = false
}

dependencies {
    api(project(":weiran-cqt-domain"))
    implementation(project(":weiran-framework"))
    implementation("io.jsonwebtoken:jjwt-api")
    implementation("org.springframework.security:spring-security-crypto")
    implementation("com.github.ben-manes.caffeine:caffeine")
    // 阿里云短信 SDK（版本在 weiran-dependencies/biz-dependencies.gradle.kts，D-013）。
    implementation("com.aliyun:dysmsapi20170525")
    // 阿里云 OSS SDK（文件存储，版本同上）。
    implementation("com.aliyun.oss:aliyun-sdk-oss")
    // JJWT 的时间入参只接受 java.util.Date，而 Forbidden APIs 全局禁用它。
    // 这个依赖只为在那一处边界打 @SuppressForbidden，不放宽规则本身。
    compileOnly("de.thetaphi:forbiddenapis")
    runtimeOnly("io.jsonwebtoken:jjwt-impl")
    runtimeOnly("io.jsonwebtoken:jjwt-jackson")
}
