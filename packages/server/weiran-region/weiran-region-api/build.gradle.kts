plugins {
    id("com.wulicode.weiran.java-conventions")
}

description = "weiran-region 对外契约：行政区划视图、错误码与登录态查询服务。"

weiranConventions {
    jacocoVerificationEnabled = false
}

dependencies {
    api(project(":weiran-framework"))
}
