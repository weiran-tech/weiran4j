plugins {
    id("com.weiran.boot-app-conventions")
}

description = "weiran4j 可执行应用：聚合各业务模块的适配层与基础设施层并启动。"

weiranConventions {
    // 本模块只有一个 @SpringBootApplication 启动类，没有业务逻辑——装配都在各模块自己的
    // AutoConfiguration 里。对一个 main 方法做覆盖率考核，度量的是「有没有为 main 补个假测试」。
    // 本模块真正的验证手段是 AuthEndpointIT：真起容器、真连库、真发 HTTP，
    // 它验的是跨模块装配是否成立，而这件事覆盖率数字本来就表达不了。
    jacocoVerificationEnabled = false
}

dependencies {
    implementation(project(":weiran-system-adapter"))
    implementation(project(":weiran-system-infrastructure"))
    implementation("com.kjs.wuli3:wuli3-logging-spring-boot-starter")
    runtimeOnly("com.mysql:mysql-connector-j")
    testImplementation("com.h2database:h2")
    // 集成测试直接用 JdbcTemplate 造数据：走 Mapper 造数会让「造数」和「被测逻辑」
    // 共用同一条实现路径，实现整体写错时测试照样绿。
    testImplementation("org.springframework.boot:spring-boot-starter-jdbc")
}

// 本地开发从仓库根的 config/ 读 YAML，而不是靠 shell 里的环境变量。
//
// 两处刻意不用默认行为：
//   1. Spring Boot 默认探测的 `./config/` 是**进程工作目录**下的 config，而 bootRun 的工作目录
//      是 weiran-app/ 而非仓库根 —— 默认行为会去找 weiran-app/config/。这里给绝对路径消除歧义，
//      顺带让 IDE 里直接跑 main 方法也能命中同一份配置。
//   2. `optional:` 前缀让 config/ 不存在时不炸。真正该炸的是缺密钥，那由
//      JwtAccessTokenIssuer.afterPropertiesSet() 报，错误信息比「文件找不到」精确得多。
tasks.named<org.springframework.boot.gradle.tasks.run.BootRun>("bootRun") {
    systemProperty("spring.config.additional-location", "optional:file:$rootDir/config/")
    systemProperty("spring.profiles.active", (findProperty("profile") as String?) ?: "local")
    // Gradle 默认不把父进程的 stdin 转给子进程，交互式的 ResetPasswordRunner 等
    // CommandLineRunner 拿到的会是空流、readLine() 立刻返回 null。这里显式接上。
    standardInput = System.`in`
}
