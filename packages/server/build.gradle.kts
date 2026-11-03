import org.gradle.api.publish.PublishingExtension
import org.gradle.api.publish.maven.MavenPublication

plugins {
    base
}

group = "com.wulicode.weiran"
version = providers.gradleProperty("libVersion").orElse("0.1.0-SNAPSHOT").get()

// 本仓的库和 BOM 共用 libVersion；可执行应用与可选演示模块只随 demoVersion 变化。
val demoVersion = providers.gradleProperty("demoVersion").orElse(version.toString())
val githubUser = providers.gradleProperty("gpr.user").orElse(providers.environmentVariable("GITHUB_ACTOR"))
val githubToken = providers.gradleProperty("gpr.key").orElse(providers.environmentVariable("GITHUB_TOKEN"))

subprojects {
    group = rootProject.group
    version = if (name == "weiran-app" || name == "weiran-demo") demoVersion.get() else rootProject.version

    // BOM 自己已声明 javaPlatform publication；库模块发布普通 jar、sources jar 和依赖元数据。
    if (name != "weiran-dependencies" && name != "weiran-app" && name != "weiran-demo") {
        plugins.withId("java-library") {
            pluginManager.apply("maven-publish")
            extensions.configure<PublishingExtension> {
                publications.create<MavenPublication>("mavenJava") {
                    from(components["java"])
                }
            }
        }
    }

    plugins.withId("maven-publish") {
        extensions.configure<PublishingExtension> {
            repositories {
                maven {
                    name = "GitHubPackages"
                    url = uri("https://maven.pkg.github.com/weiran-tech/weiran4j")
                    credentials {
                        username = githubUser.orNull
                        password = githubToken.orNull
                    }
                }
            }
        }
    }
}
