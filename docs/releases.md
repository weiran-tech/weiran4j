# 两条发布线

本仓在同一个 Git 仓库中维护两种互不联动的版本：

| tag | 发布物 | 位置 |
| --- | --- | --- |
| `lib-v1.2.3` | `com.wulicode.weiran:weiran-dependencies:1.2.3` 与全部库模块 | [GitHub Packages Maven/Gradle 仓库](https://maven.pkg.github.com/weiran-tech/weiran4j) |
| `demo-v1.2.3` | 前端与后端 Demo 容器镜像、Compose 文件 | GHCR 与 [GitHub Releases](https://github.com/weiran-tech/weiran4j/releases) |

两条版本线可以各自递增。Demo 镜像始终由对应 tag 的仓库源码构建，Release 记录提交 SHA、可追溯的最近组件包 tag 及两个镜像摘要；不能仅凭版本号推断 Demo 一定使用了已发布组件包的相同代码。

## 发布组件包

在准备发布的提交通过 CI 后创建并推送 `lib-v<主>.<次>.<修订>` tag，例如 `lib-v0.1.2`。[`publish-libraries.yml`](../.github/workflows/publish-libraries.yml) 使用 JDK 21 跑后端 `check`，然后以 tag 中的版本发布 BOM、framework、system 和 region 的五层及 `weiran-system`、`weiran-region` 入口包。发布成功后，工作流创建 GitHub Release，并由 [说明脚本](../.github/scripts/lib-release-notes.sh) 列出上一枚 `lib-v*` tag 以来的直接提交及其链接；首次发布仅写入组件包坐标。提交标题应写清本次改动，否则自动说明也会含糊。`weiran-app` 和 `weiran-demo` 不发布。BOM 与它登记的本仓模块必须同批发布，不能留下引用不到的坐标。`lib-v0.1.1` 没有 `weiran-system` 入口包；从 `0.1.2` 起使用该坐标。

```bash
git tag lib-v0.1.2
git push origin lib-v0.1.2
```

工作流用仓库的 `GITHUB_TOKEN` 发布；首次发布后在 GitHub Packages 检查包是否关联本仓、可见性与下载权限。GitHub Packages 的 Maven/Gradle 包即使公开，下载端仍需鉴权；本地消费使用具有 `read:packages` 的 classic PAT，令牌只放在用户级配置或 CI secret。详情见 [GitHub Gradle registry 文档](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-gradle-registry)。

下游项目在 `settings.gradle.kts` 的 `dependencyResolutionManagement.repositories` 加入：

```kotlin
mavenCentral()
maven {
    url = uri("https://maven.pkg.github.com/weiran-tech/weiran4j")
    credentials {
        username = providers.gradleProperty("gpr.user").orNull
        password = providers.gradleProperty("gpr.key").orNull
    }
}
```

将 `gpr.user` 和 `gpr.key` 放在下游构建机的用户级 `~/.gradle/gradle.properties`，再按需引入：

```kotlin
dependencies {
    implementation(platform("com.wulicode.weiran:weiran-dependencies:0.1.2"))
    implementation("com.wulicode.weiran:weiran-system")
    implementation("com.wulicode.weiran:weiran-region")
}
```

外部应用可引入 system 和 region 两个入口包。它们各自只把 `*-api` 放在编译依赖中，将 `*-adapter` 与 `*-infrastructure` 放在运行依赖中；Gradle 会经它们取得剩余层和自动配置。已经装配 weiran4j 基座的应用只需添加 region 入口依赖。直接 fork 本仓源码的下游继续由 `weiran-app` 按五层项目依赖装配，无需再下载入口包。

## 发布完整 Demo 镜像

在准备发布的提交通过 CI 后推送 `demo-v<主>.<次>.<修订>` tag。[`publish-demo.yml`](../.github/workflows/publish-demo.yml) 运行后端与前端门禁，验证 Demo bootJar 包含演示模块及迁移，先用两张本地镜像启动 Compose 并检查健康接口和演示菜单，再发布两张同版本镜像并创建 GitHub Release。Release 保留源码提交、组件包 tag、镜像摘要和部署命令，并从上一枚 `demo-v*` tag 自动生成变更说明；首次发布仅写入部署信息：

```text
ghcr.io/weiran-tech/weiran4j-demo-backend:0.3.0
ghcr.io/weiran-tech/weiran4j-demo-web:0.3.0
```

```bash
git tag demo-v0.3.0
git push origin demo-v0.3.0
```

首次推送后如需无需登录即可下载，在 GitHub Packages 将两张容器镜像设为 public；[GHCR 的公开镜像支持匿名拉取](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)。发布使用工作流的 `GITHUB_TOKEN`。

从对应 GitHub Release 下载 `compose.yml` 和 `demo.env.example`，放到同一目录，复制配置并填写密钥：

```bash
cp demo.env.example .env
# 填 WEIRAN_DB_PASSWORD、WEIRAN_JWT_SECRET；JWT 密钥至少 32 字节。
docker compose --env-file .env -f compose.yml pull
docker compose --env-file .env -f compose.yml up -d
```

浏览器访问 `http://localhost:5202`。Compose 使用独立的 `weiran4j_demo` 数据库和命名卷；后端镜像把 `weiran-demo` 打进 bootJar，并用现有 `local` profile 加载 `db/app-demo` 迁移。Compose 同时把 DEBUG 日志、Swagger 和本地文件存储关闭。生产部署的 [`docker-compose.yml`](../docker-compose.yml) 仍构建普通镜像，不会打包演示模块。

本机 HTTP 演示默认 `WEIRAN_COOKIE_SECURE=false`。如果把 Demo 放到 HTTPS 地址，在 `.env` 中改为 `true`，并把 `WEIRAN_PUBLIC_BASE_URL` 设置为实际对外地址；前端与后端仍须同源。演示数据库含初始账号 `admin` / `admin123`，对外开放前要修改密码。使用已有数据卷升级 Demo 时，先核对该版本新增的 Flyway 脚本；不要把演示 Compose 指向业务或生产数据库。

## 本地验证发布物

所有 Gradle 命令都使用 JDK 21。组件包可先生成 POM，检查 BOM 中每个 `com.wulicode.weiran` 坐标都存在对应 publication；Demo 可按发布工作流构建 bootJar，检查其中的 `weiran-demo` 依赖与迁移。

```bash
cd weiran4j
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
./gradlew spotlessApply
./gradlew check --no-daemon
./gradlew :weiran-dependencies:generatePomFileForMavenBomPublication -PlibVersion=0.1.0
./gradlew :weiran-app:bootJar -Pweiran.demo.image=true -PdemoVersion=0.3.0
```
