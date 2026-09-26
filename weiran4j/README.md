# weiran4j

**Java 21 + MySQL 8 + Semi UI** 的后台管理框架底座，能力形态对标 mono4ts 的标准后台：
登录/JWT、用户、角色、菜单（动态路由 + 按钮权限）、部门、字典、系统配置、登录日志、操作日志。

|      |                                                                                   |
| ---- | --------------------------------------------------------------------------------- |
| 后端 | JDK 21 · Gradle 9 · Spring Boot 3.5 · MyBatis-Plus · Flyway · MySQL 8 · JWT(jjwt)  |
| 分层 | DDD 五层（api / domain / application / infrastructure / adapter）                  |
| 前端 | pnpm · Vite · React 19 · Semi UI · TanStack Query · React Router 7（位于 `../web`） |
| 流程 | openspec（L0–L10 闸门）                                                           |

## 快速开始

```bash
# 0. JDK 21 必需。本机默认 JDK 更高时格式化器会崩，且报错指向错误方向
export JAVA_HOME=$(/usr/libexec/java_home -v 21)

# 1. 后端全量门禁（集成测试用 Testcontainers MySQL，需要 Docker）
./gradlew check

# 2. 准备一个空库，启动时 Flyway 自动建表并写入种子数据
mysql -uroot -e "CREATE DATABASE weiran4j DEFAULT CHARACTER SET utf8mb4"
cp config/application-local.yml.example config/application-local.yml   # 填库密码与 JWT 密钥（openssl rand -base64 48）
./gradlew :weiran-app:bootRun          # 自动激活 local profile，默认 3300 端口

# 3. 前端（仓库根目录）
cd .. && pnpm install && pnpm dev      # 默认 5373，/api 代理到 3300
```

打开 http://localhost:5373 ，用 **`admin` / `admin123`** 登录。⚠️ 上线前必须修改该密码。

## 模块

| Gradle 模块 | 职责 |
| --- | --- |
| `build-logic` | 约定插件：Checkstyle / Spotless / SpotBugs / Forbidden APIs / Error Prone + NullAway / Jacoco |
| `weiran-dependencies` | BOM，所有版本号只在这里 |
| `weiran-common` | 错误码、分页、响应包络（纯 Java） |
| `weiran-framework` | 统一响应、全局异常、认证拦截、`@RequiresPermission`、`@OperationLog`、MyBatis-Plus 配置 |
| `weiran-system-*` | 认证 / 用户 / 角色 / 菜单 / 部门 / 登录日志 |
| `weiran-platform-*` | 字典 / 系统配置 / 操作日志 |
| `weiran-app` | 启动模块与集成测试 |

## 文档

| 文档 | 内容 |
| --- | --- |
| [`CLAUDE.md`](CLAUDE.md) | 开发约定、分层规矩、门禁硬约束（AI 与人都读这份） |
| [`docs/01-架构与接口契约.md`](docs/01-架构与接口契约.md) | **前后端唯一契约**：模块、表结构、种子数据、全部接口与错误码 |
| [`docs/00-决策记录.md`](docs/00-决策记录.md) | 关键决策与理由，只增不改（重写见 D-008） |
| [`openspec/rules/enforced/constitution.md`](openspec/rules/enforced/constitution.md) | 跨 change 的工程不变量 CP-1…CP-11 |
| [`openspec/design/README.md`](openspec/design/README.md) | openspec 流水线怎么用 |
