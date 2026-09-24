
# weiran4j

Weiran 框架的 Java 重做。本目录是 monorepo：**Java 后端 + 前端 web + openspec 工作流**。


|      |                                                                      |
| ---- | -------------------------------------------------------------------- |
| 后端 | JDK 21 · Gradle 9.6.1 · Spring Boot 3.5.15 · MyBatis-Plus            |
| 底座 | [wuli3-gradle](https://github.com/Y-cs/wuli3-gradle)（公司内部框架） |
| 前端 | pnpm · Vite · React 19 · TanStack Query                              |
| 流程 | openspec（L0–L10 闸门）                                              |

## 快速开始

```bash
# 0. JDK 21 必需。本机默认 JDK 更高时格式化器会崩，且报错指向错误方向
export JAVA_HOME=$(/usr/libexec/java_home -v 21)

# 1. 底座尚未发布到公司 Nexus，先发到本地 Maven 仓库
git clone git@github.com:Y-cs/wuli3-gradle.git /tmp/wuli3
(cd /tmp/wuli3 && ./gradlew publishToMavenLocal -x test)

# 2. 后端
./gradlew check                 # 全量门禁

# 本地运行配置走 YAML，不走环境变量。复制模板后填库密码与 JWT 密钥：
cp config/application-local.yml.example config/application-local.yml
./gradlew :weiran-app:bootRun   # 自动激活 local profile，读 config/，默认 3300 端口

# 3. 前端
pnpm install
pnpm dev                        # 默认 5373，代理 /api 到 3300
```

## 当前进度

已完成 **骨架 + 一条纵向切片**（用户 / RBAC / JWT 登录），其余业务模块待建。


| 接口                      | 说明                                       |
| ------------------------- | ------------------------------------------ |
| `POST /api/v1/auth/login` | 通行证（用户名 / 手机号 / 邮箱）+ 密码登录 |
| `GET /api/v1/auth/me`     | 当前账号及其角色、权限                     |

模块规划与新增模块的步骤见 [`docs/10-模块映射.md`](docs/10-模块映射.md)。

## 文档


| 文档                                                               | 内容                                              |
| ------------------------------------------------------------------ | ------------------------------------------------- |
| [`CLAUDE.md`](CLAUDE.md)                                           | 开发约定、分层规矩、门禁硬约束（AI 与人都读这份） |
| [`docs/00-决策记录.md`](docs/00-决策记录.md)                       | 关键决策与理由，只增不改                          |
| [`docs/10-模块映射.md`](docs/10-模块映射.md)                       | PHP → Java 模块对照与优先级                       |
| [`docs/20-数据迁移注意事项.md`](docs/20-数据迁移注意事项.md)       | **迁移前必读**，含阻塞项                          |
| [`openspec/rules/enforced/constitution.md`](openspec/rules/enforced/constitution.md) | 跨 change 的工程不变量 CP-1…CP-11                 |
| [`openspec/design/README.md`](openspec/design/README.md)           | openspec 流水线怎么用                             |

## 来源项目


|            | 路径                                                                 | 用途                                   |
| ---------- | -------------------------------------------------------------------- | -------------------------------------- |
| PHP 原项目 | `/Users/duoli/Projects/duoli-weiran/weiran-v1`                       | 业务与数据模型的事实源，迁移期并行运行 |
| 前端参考   | `/Users/duoli/Projects/hanrui-jinnuo/mono4ts/packages/web`           | 技术栈参考                             |
| 流程来源   | `/Users/duoli/Projects/hanrui-jinnuo/mono4ts/openspec`               | openspec 工作流                        |
| 底座       | [github.com/Y-cs/wuli3-gradle](https://github.com/Y-cs/wuli3-gradle) | 公司内部 Java 框架                     |

> ⚠️ 迁移期 weiran4j 与 weiran-v1 **并行读写同一套 `pam_*` 表**。
> 改这些表之前先读 `docs/20-数据迁移注意事项.md`——其中「`password` 列宽」是阻塞项。
