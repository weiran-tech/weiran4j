plugins {
    id("com.weiran.java-conventions")
}

description = "weiran-system 领域层：聚合、领域规则（密码策略、树环检测、内置数据保护、权限判定）与仓储端口。不依赖任何框架。"

weiranConventions {
    // 领域规则全部是纯函数式的判断，写纯单测成本最低，门槛相应提高。
    jacocoLineMinimum = "0.70"
}

dependencies {
    api(project(":weiran-common"))
}
