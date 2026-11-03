plugins {
    id("com.wulicode.weiran.spring-conventions")
}

description = "可选组件演示：仅 local/test 使用的菜单、配置、批处理示例。"

weiranConventions {
    jacocoVerificationEnabled = false
}

dependencies {
    implementation(project(":weiran-system-api"))
    implementation(project(":weiran-framework"))
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework:spring-jdbc")
    implementation("org.apache.poi:poi-ooxml")
}
