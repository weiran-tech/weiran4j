import org.gradle.testing.jacoco.tasks.JacocoCoverageVerification
import org.gradle.testing.jacoco.tasks.JacocoReport

plugins {
    id("com.weiran.boot-app-conventions")
}

description = "weiran4j 可执行应用：聚合各业务模块的适配层与基础设施层，承载跨模块集成测试。"

/**
 * 只能靠集成测试验证的层（application / infrastructure / adapter）以及 framework 的装配部分，
 * 覆盖率在这里跨模块聚合考核：各模块自己的 jacoco 门禁对这些层关闭（见各模块 build 脚本），
 * 由本模块的 Testcontainers 集成测试产生的执行数据统一度量。
 */
val aggregatedCoverageProjects = listOf(
    ":weiran-framework",
    ":weiran-system-application",
    ":weiran-system-infrastructure",
    ":weiran-system-adapter",
    ":weiran-platform-application",
    ":weiran-platform-infrastructure",
    ":weiran-platform-adapter",
)

weiranConventions {
    // 聚合口径：本模块自身只有启动类，数字几乎全部来自上面列出的模块。
    jacocoLineMinimum = "0.70"
}

dependencies {
    implementation(project(":weiran-system-adapter"))
    implementation(project(":weiran-system-infrastructure"))
    implementation(project(":weiran-platform-adapter"))
    implementation(project(":weiran-platform-infrastructure"))
    implementation("org.flywaydb:flyway-core")
    implementation("org.flywaydb:flyway-mysql")
    implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui")
    runtimeOnly("com.mysql:mysql-connector-j")

    testImplementation("org.springframework.boot:spring-boot-testcontainers")
    testImplementation("org.testcontainers:junit-jupiter")
    testImplementation("org.testcontainers:mysql")
    // 操作日志异步落库，断言时需要轮询等待。
    testImplementation("org.awaitility:awaitility")
    // 集成测试直接用 JdbcTemplate 查库断言：走 Mapper 断言会让「断言」和「被测逻辑」
    // 共用同一条实现路径，实现整体写错时测试照样绿。
    testImplementation("org.springframework.boot:spring-boot-starter-jdbc")
}

aggregatedCoverageProjects.forEach { path ->
    val covered = project(path)
    tasks.withType<JacocoReport>().configureEach {
        dependsOn("$path:classes")
        additionalSourceDirs.from(covered.layout.projectDirectory.dir("src/main/java"))
        additionalClassDirs.from(covered.layout.buildDirectory.dir("classes/java/main"))
    }
    tasks.withType<JacocoCoverageVerification>().configureEach {
        dependsOn("$path:classes")
        additionalSourceDirs.from(covered.layout.projectDirectory.dir("src/main/java"))
        additionalClassDirs.from(covered.layout.buildDirectory.dir("classes/java/main"))
    }
}

// 本地开发从仓库根的 config/ 读 YAML，而不是靠 shell 里的环境变量。
//
// 两处刻意不用默认行为：
//   1. Spring Boot 默认探测的 `./config/` 是**进程工作目录**下的 config，而 bootRun 的工作目录
//      是 weiran-app/ 而非仓库根 —— 默认行为会去找 weiran-app/config/。这里给绝对路径消除歧义，
//      顺带让 IDE 里直接跑 main 方法也能命中同一份配置。
//   2. `optional:` 前缀让 config/ 不存在时不炸。真正该炸的是缺密钥，那由 JWT 组件启动时报，
//      错误信息比「文件找不到」精确得多。
tasks.named<org.springframework.boot.gradle.tasks.run.BootRun>("bootRun") {
    systemProperty("spring.config.additional-location", "optional:file:$rootDir/config/")
    systemProperty("spring.profiles.active", (findProperty("profile") as String?) ?: "local")
}
