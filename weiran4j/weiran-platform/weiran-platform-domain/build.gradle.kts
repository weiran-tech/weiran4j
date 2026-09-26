plugins {
    id("com.weiran.java-conventions")
}

description = "weiran-platform 领域层：字典、系统配置（按类型校验值）、操作日志与仓储端口。不依赖任何框架。"

weiranConventions {
    // 领域规则全部是纯函数式的判断，写纯单测成本最低，门槛相应提高。
    jacocoLineMinimum = "0.70"
}

dependencies {
    api(project(":weiran-common"))
}
