plugins {
    id("com.weiran.java-conventions")
}

description = "weiran-cqt 对外契约：DTO、命令对象、应用服务接口与业务错误码（序号段 20–39）。只依赖 weiran-common。"

weiranConventions {
    // 本模块只有 record、接口与错误码枚举，没有可执行的逻辑分支。
    jacocoVerificationEnabled = false
}

dependencies {
    api(project(":weiran-common"))
}
