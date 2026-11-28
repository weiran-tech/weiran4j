# 发布线

本仓在同一个 Git 仓库中维护四种互不联动的版本：

| tag | 发布物 | 位置 |
| --- | --- | --- |
| `lib-v1.2.3` | `com.wulicode.weiran:weiran-dependencies:1.2.3` 与全部库模块 | [GitHub Packages Maven/Gradle 仓库](https://maven.pkg.github.com/weiran-tech/weiran4j) |
| `demo-v1.2.3` | 前端与后端 Demo 容器镜像、Compose 文件 | GHCR 与 [GitHub Releases](https://github.com/weiran-tech/weiran4j/releases) |
| `manage-v1.2.3` | `@weiran-tech/manage` React 组件包 | [npmjs.org](https://www.npmjs.com/package/@weiran-tech/manage) |

| `prototype-v1.2.3` / `rp-v1.2.3` | `@weiran-tech/prototype` 原型框架包（两个标签前缀指向同一包） | [npmjs.org](https://www.npmjs.com/package/@weiran-tech/prototype) |

四条版本线可以各自递增。Demo 镜像始终由对应 tag 的仓库源码构建，Release 记录提交 SHA、可追溯的最近 Java 组件包 tag 及两个镜像摘要；不能仅凭版本号推断 Demo 一定使用了已发布组件包的相同代码。

## 发布前端组件包

- `packages/component-manage` → `@weiran-tech/manage`，标签 `manage-v<版本>`。
- `packages/component-prototype` → `@weiran-tech/prototype`，标签 `prototype-v<版本>` 或 `rp-v<版本>`；同一版本选其中一个即可。

先更新目标 package.json 的 version，执行 `pnpm pack:components`、前端及原型门禁，然后将变更合入 main，再推送匹配版本的标签：

```bash
git tag manage-v0.5.0
git push origin manage-v0.5.0
# 原型包发布独立递增，以下两种前缀二选一
git tag prototype-v0.1.0
git push origin prototype-v0.1.0
```

[`publish-components.yml`](../.github/workflows/publish-components.yml) 校验目标包、标签版本和 main 来源，构建 JS / 类型 / CSS，执行消费者门禁后发布 npm tarball。预发布版本（如 `prototype-v0.2.0-beta.1`）使用 `next`，正式版本使用 `latest`。同版本已存在时核对完整 tarball integrity；内容一致跳过，内容不同失败，不能覆盖旧发布物。

两个新包分别配置 npm Trusted Publisher：组织 `weiran-tech`、仓库 `weiran4j`、工作流 `publish-components.yml`。原 `@weiran-tech/semi-components` 的权限和 Trusted Publisher 不会自动迁到新包。首次发布可在仓库配置限定 scope/包权限的 `NPM_TOKEN`，待新包创建并配置可信发布后移除，之后使用 OIDC；令牌不进源码。具体权限与 npm CLI 要求见 [npm 官方说明](https://docs.npmjs.com/trusted-publishers/)。

本仓工作区使用本地链接；原型独立导出使用普通 semver，从 npm 安装对应版本。发布两个新包前，独立原型无法从 npm 安装尚不存在的版本，因此应先发布组件，再同步独立原型仓库。旧包不自动撤回或弃用；下游将导入和样式路径改为 `@weiran-tech/manage` 与 `@weiran-tech/manage/style.css`。

## 发布组件包

在准备发布的提交通过 CI 后创建并推送 `lib-v<主>.<次>.<修订>` tag，例如 `lib-v0.1.2`。[`publish-libraries.yml`](../.github/workflows/publish-libraries.yml) 使用 JDK 21 跑后端 `check`，然后以 tag 中的版本发布 BOM、framework、system 和 region 的五层及 `weiran-system`、`weiran-region` 入口包。发布成功后，工作流创建 GitHub Release，并由 `.github/scripts/lib-release-notes.sh` 列出上一枚 `lib-v*` tag 以来的中文提交标题及其链接；首次发布仅写入组件包坐标。若提交标题没有中文，先在 `.github/release-notes/lib-v<版本>.md` 编写中文说明再创建 tag，发布工作流会在上传组件包前检查并使用该文件。`weiran-app` 不作为库发布。BOM 与它登记的本仓模块必须同批发布，不能留下引用不到的坐标。`lib-v0.1.1` 没有 `weiran-system` 入口包；从 `0.1.2` 起使用该坐标。

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
    content { includeGroup("com.wulicode.weiran") }
    credentials {
        username = providers.gradleProperty("gpr.user").orNull
        password = providers.gradleProperty("gpr.key").orNull
    }
}
```

当前源码已按 D-017 接入 Wuli3 1.1.1；消费从本次接入之后发布的 Java 库时，还需为其传递依赖配置 Wuli3 仓库（账号须对两边的包均有读取权限）：

```kotlin
maven {
    url = uri("https://maven.pkg.github.com/weiran-tech/wuli3")
    content { includeGroup("com.wulicode.wuli3") }
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

## 发布后台体验镜像

在准备发布的提交通过 CI 后推送 `demo-v<主>.<次>.<修订>` tag。[`publish-demo.yml`](../.github/workflows/publish-demo.yml) 运行后端与前端门禁，验证 bootJar 不含示例模块与测试夹具且保留历史迁移，先用两张本地镜像启动 Compose 并检查健康接口和旧示例菜单已清理，再发布两张同版本镜像并创建 GitHub Release。Release 保留源码提交、组件包 tag、镜像摘要和部署命令，并从上一枚 `demo-v*` tag 自动生成变更说明；首次发布仅写入部署信息：

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

浏览器访问 `http://localhost:5202`。Compose 使用独立的 `weiran4j_demo` 数据库和命名卷；体验镜像使用普通后台 bootJar，不包含页面示例、示例接口或测试夹具；保留 `local` profile 校验旧 `db/app-demo` 历史，追加迁移清理旧示例菜单、配置和结果表。页面和组件示例在文档站独立访问。Compose 同时把 DEBUG 日志、Swagger 和本地文件存储关闭。生产部署的 [`docker-compose.yml`](../docker-compose.yml) 仍构建普通镜像，不会打包演示模块。

本机 HTTP 演示默认 `WEIRAN_COOKIE_SECURE=false`。如果把 Demo 放到 HTTPS 地址，在 `.env` 中改为 `true`，并把 `WEIRAN_PUBLIC_BASE_URL` 设置为实际对外地址；前端与后端仍须同源。演示数据库含初始账号 `admin` / `admin123`，对外开放前要修改密码。使用已有数据卷升级 Demo 时，先核对该版本新增的 Flyway 脚本；不要把演示 Compose 指向业务或生产数据库。

## 本地验证发布物

所有 Gradle 命令都使用 JDK 21。组件包可先生成 POM，检查 BOM 中每个 `com.wulicode.weiran` 坐标都存在对应 publication；体验镜像可按发布工作流构建 bootJar，检查其中不含示例模块与测试夹具，且仍保留旧数据库需要的历史迁移。

```bash
cd packages/server
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
./gradlew spotlessApply
./gradlew check --no-daemon
./gradlew :weiran-dependencies:generatePomFileForMavenBomPublication -PlibVersion=0.1.0
./gradlew :weiran-app:bootJar -PdemoVersion=0.3.0
```
