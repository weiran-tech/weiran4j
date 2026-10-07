plugins {
    id("com.weiran.java-conventions")
}

description = "weiran-cqt 领域层：常青藤赛事（赛事配置、报名作品、评审、奖项证书、C 端账号、内容）的领域规则和仓储端口。不依赖任何框架。"

weiranConventions {
    jacocoLineMinimum = "0.70"
}

dependencies {
    api(project(":weiran-framework"))
}
