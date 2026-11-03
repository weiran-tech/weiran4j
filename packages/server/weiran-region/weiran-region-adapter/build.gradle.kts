plugins {
    id("com.wulicode.weiran.spring-conventions")
}

description = "weiran-region 适配层：地区管理 HTTP API、权限与操作日志。"

weiranConventions {
    jacocoVerificationEnabled = false
}

dependencies {
    api(project(":weiran-region-application"))
    // 编译引用的应用服务带事务注解；框架不会向下游传递 Spring 依赖。
    implementation("org.springframework:spring-tx")
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-validation")
}
