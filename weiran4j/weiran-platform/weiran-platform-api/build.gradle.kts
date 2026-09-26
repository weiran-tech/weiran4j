plugins {
    id("com.weiran.java-conventions")
}

description = "weiran-platform 对外契约：DTO、命令对象与应用服务接口。只依赖 weiran-common。"

weiranConventions {
    // 本模块只有 record 与接口，没有可执行的逻辑分支；覆盖率考核只会逼出为 getter 补的假测试。
    jacocoVerificationEnabled = false
}

dependencies {
    api(project(":weiran-common"))
}
