plugins {
    id("com.wulicode.weiran.java-conventions")
}

description = "weiran-region 领域层：行政区划聚合、层级规则与仓储端口。"

weiranConventions {
    jacocoLineMinimum = "0.70"
}

dependencies {
    api(project(":weiran-framework"))
}
