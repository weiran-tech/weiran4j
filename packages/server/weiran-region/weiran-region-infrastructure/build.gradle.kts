plugins {
    id("com.wulicode.weiran.spring-conventions")
}

description = "weiran-region 基础设施层：region 表 MyBatis-Plus 持久化实现。"

weiranConventions {
    jacocoVerificationEnabled = false
}

dependencies {
    api(project(":weiran-region-domain"))
    implementation(project(":weiran-framework"))
    implementation("com.baomidou:mybatis-plus-spring-boot3-starter")
}
