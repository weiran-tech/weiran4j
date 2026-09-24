plugins {
    id("com.weiran.spring-conventions")
}

description = "weiran-system 基础设施层：MyBatis-Plus 持久化、JWT 签发、密码编码等领域端口的实现。"

dependencies {
    api(project(":weiran-system-domain"))
    implementation("com.kjs.wuli3:wuli3-mysql-spring-boot-starter")
    implementation("org.springframework.security:spring-security-crypto")
    implementation("io.jsonwebtoken:jjwt-api")
    // JJWT 的时间入参只接受 java.util.Date，而 Forbidden APIs 全局禁用它。
    // 这个依赖只为在那一处边界打 @SuppressForbidden，不放宽规则本身。
    compileOnly("de.thetaphi:forbiddenapis")
    runtimeOnly("io.jsonwebtoken:jjwt-impl")
    runtimeOnly("io.jsonwebtoken:jjwt-jackson")
}
