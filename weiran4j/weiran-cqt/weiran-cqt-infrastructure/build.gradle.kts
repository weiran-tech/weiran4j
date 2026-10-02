plugins {
    id("com.weiran.spring-conventions")
}

description = "weiran-cqt 基础设施层：MyBatis-Plus 持久化与 db/migration/cqt/ 下的 Flyway 脚本（表前缀 cqt_）。"

weiranConventions {
    // Mapper 与仓储实现只有连着真 MySQL 才能验证，由 weiran-app 的集成测试覆盖并聚合考核。
    jacocoVerificationEnabled = false
}

dependencies {
    api(project(":weiran-cqt-domain"))
    implementation(project(":weiran-framework"))
}
