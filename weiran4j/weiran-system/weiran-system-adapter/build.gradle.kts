plugins {
    id("com.weiran.spring-conventions")
}

description = "weiran-system 适配层：HTTP Controller、请求校验、认证过滤器。"

dependencies {
    api(project(":weiran-system-application"))
    api("com.kjs.wuli3:wuli3-web-spring-boot-starter")
}
