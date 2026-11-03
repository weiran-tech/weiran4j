plugins {
    id("com.wulicode.weiran.spring-conventions")
}

description = "weiran-region 应用层：地区管理、筛选查询与登录态 lookup 用例。"

weiranConventions {
    jacocoVerificationEnabled = false
}

dependencies {
    api(project(":weiran-region-api"))
    api(project(":weiran-region-domain"))
    api(project(":weiran-framework"))
    implementation("org.springframework:spring-tx")
}
