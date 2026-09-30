plugins {
    id("com.weiran.java-conventions")
}

description = "weiran-base 领域层：身份权限（密码策略、树环检测、内置数据保护、权限判定）与平台能力（字典、系统配置、操作日志）的领域规则和仓储端口。不依赖任何框架。"

weiranConventions {
    // 领域规则全部是纯函数式的判断，写纯单测成本最低，门槛相应提高。
    jacocoLineMinimum = "0.70"
}

dependencies {
    api(project(":weiran-common"))
}
