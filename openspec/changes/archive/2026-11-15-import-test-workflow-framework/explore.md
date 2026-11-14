---
title: "测试工作流迁移现实校验"
status: "ready"
updated_at: "2026-11-15"
---

# Explore

## 调研范围

| 模块 | 目录/文件 | 为什么看它 |
|---|---|---|
| 源测试框架 | `/Users/duoli/Projects/kr-alang-mono4j/tests/` | 注册表 13 条流程；framework 26 个文件，约 240KB；区分框架和业务。 |
| 当前认证与健康 | `packages/server/weiran-system/`、`weiran-framework/` | 核实接口、Cookie/CSRF 和登出真实语义。 |
| 工程入口 | `package.json`、`turbo.json`、`.github/workflows/ci.yml`、`docs/` | 保留已有测试链并接入离线新门禁。 |

## 现有实现

| 能力 | 位置 | 现状 |
|---|---|---|
| CLI 与严格报告 | 源 `tests/framework/cli.mjs:1`、`core.mjs:1` | list/check/doctor/run/review/session 等入口，声明校验、失败证据严格复核可复用。 |
| 源会话协议 | 源 `tests/framework/session.mjs:52`、`browser.mjs:20` | 固定 alang_principal、Bearer + Wuli3 主体头、字符串成功码；不能原样迁移。 |
| 当前登录 | `packages/server/weiran-system/weiran-system-adapter/src/main/java/com/wulicode/weiran/system/adapter/web/AuthController.java:98` | Cookie 默认模式，脚本可显式选择 token；成功 code 数字 0。 |
| 当前登出 | `packages/server/weiran-system/weiran-system-application/src/main/java/com/wulicode/weiran/system/application/auth/AuthApplicationService.java:234` | 记录登出日志，普通登出不吊销已签发 JWT；Controller 清浏览器 Cookie。 |
| 当前健康 | `packages/server/weiran-framework/src/main/java/com/wulicode/weiran/framework/web/HealthController.java:11` | GET /api-backend/n/health 返回 status=UP，属于存活检查，不聚合数据库健康。 |
| 测试和 CI | `package.json:15`、`.github/workflows/ci.yml:45` | 根 test 为 Vitest；后端有独立 Gradle/Testcontainers；暂无 tests/ 流程执行器。 |
| 现有前端 | `packages/manage/src/utils/request.ts:1` | Cookie 登录、写请求 X-CSRF-Token，与源项目本地存储令牌不同。 |

## 可复用点

| 可复用对象 | 位置 | 复用方式 | 需要改造吗 |
|---|---|---|---|
| 框架执行与证据 | 源 tests/framework/{batch,process,inspect,catalog,maintenance,scaffold,utils}.mjs | 迁入本地维护，保留运行/取消/摘要/复核/脚手架回归 | 是：项目标识、环境与契约引用。 |
| Playwright/Bruno 配置与模板 | 源 tests/playwright.config.ts、bruno/、framework/templates/ | 保留 API/E2E 分项目、零重试和失败模板 | 是：当前接口、数字 code 与环境。 |
| 共享步骤和 fixture | 源 tests/support/ | 同一目录职责和 evidence helper | 是：移除合同/返利和旧认证，适配 Cookie。 |
| 现有单元与集成测试 | packages/manage/src、packages/server/weiran-app | 原样保留作为既有门禁 | 否。 |

## 真实约束

| 约束 | 证据位置 | 对设计的影响 |
|---|---|---|
| 旧会话协议硬编码在框架内部 | 源 session.mjs:52/71/164、browser.mjs:20、cli.mjs:265 | 必须适配框架核心，不能仅替换用例 URL。 |
| 旧 JWT 不因普通登出失效 | AuthApplicationService.java:234 | 清理只承诺清 Cookie/本地缓存并验证匿名上下文，不能借测试新增吊销行为。 |
| 健康接口不是 Actuator | HealthController.java:11 | 不迁移不存在的 Actuator 地址；doctor 使用 API 和 web 两个真实入口。 |
| 依赖集中、账号隔离 | 根 package.json、AGENTS.md 密钥规则 | 根 pnpm 统一依赖，凭据和 storageState 均在忽略目录；认证过程禁自动 trace。 |
| 源状态有本地锁文件改动 | 源 git status | 只读源 tests 源码，不复制源锁文件或未提交配置。 |

## 影响面

### 普通改动

| 文件/模块 | 动作 |
|---|---|
| tests/framework、support、unit、api、e2e、bruno、envs、registry.json | 新增迁入与适配；不含私有运行材料。 |
| package.json、pnpm-lock.yaml、.gitignore | 新增测试命令/测试依赖与忽略规则。 |
| .github/workflows/ci.yml | 新增 Node 24 离线测试工作流 job，保留现有三个 job。 |
| README.md、AGENTS.md、docs/testing.md、docs/.vitepress/config.mts | 增加执行/编写测试入口与导航。 |
| openspec/state/bizs/artifact.md | 同步测试基础设施现状及验证边界。 |

不会碰的目录：packages/server/**、packages/manage/**、packages/semi-components/** 的实现与既有测试，源项目全部目录，test-flows/，历史归档、openspec 校验器/守卫/schema/project.json。

### 共享层命中 ⚠️

#### 桶文件 / 注册表

| ID | 文件 | 冲突原因 | 是否命中 · 预计改动 |
|---|---|---|---|
| SL-1 | settings.gradle.kts | 模块发现 | 未命中，无 Java 模块变动。 |
| SL-2 | weiran-dependencies/build.gradle.kts | BOM 共享版本 | 未命中，无 Java 依赖变动。 |
| SL-3 | weiran-app/build.gradle.kts | 应用装配 | 未命中。 |
| SL-4 | Flyway 种子菜单 | 全局时间版本及菜单 id | 未命中，无表结构、菜单或种子变动。 |
| SL-5 | manage 页面与 page-registry | 页面/菜单配对 | 未命中，无页面路由变动。 |

#### 跨模块契约

| ID | 文件 | 冲突原因 | 是否命中 · 预计改动 |
|---|---|---|---|
| SL-6 | CommonErrors.java | 错误码基座 | 未命中，测试只消费既有错误码。 |
| SL-7 | framework/page、response | 跨模块响应与分页 | 未命中，只测试现有协议。 |

#### 序号型资源与构建约定

| 对象 | 判定 | 执行安排 |
|---|---|---|
| Flyway 版本/sys_menu id | 未命中，不取号 | 不适用。 |
| build-logic 与 AutoConfiguration/imports | 未命中 | 不适用。 |
| tests/registry.json、steps/INDEX.md、package.json、pnpm-lock.yaml | 命中本次新增共享注册/依赖入口 | Layer 0 串行建立并冻结路径、CLI 和依赖。 |
| tests/framework/session、Cookie fixture、flow 契约 | 多执行单元消费 | Layer 0 先固定认证和证据语义；本次全部串行，不启用子代理。 |

## 对 interview 的反向修正

| 原结论 | 现实情况 | 修正后 | 是否已同步回 interview.md |
|---|---|---|---|
| 复用源框架会话管理 | 框架本身绑定旧 Bearer 主体协议 | 适配为 Cookie/CSRF 缓存和恢复；登出不宣称旧 JWT 失效 | 是，AC-3 与关键取舍已明确。 |
| 健康检查迁入 | 当前仅有公开存活检查 | 文档明确不代表依赖健康；删除 Actuator 专属探测 | 是，AC-6 已明确。 |

## 风险预警

| 风险 | 触发条件 | 建议应对 |
|---|---|---|
| 旧项目测试假通过 | 原样替换名称但保留旧响应与会话断言 | Cookie/CSRF、数字 code、清理状态单独回归，逐项更新系统流程。 |
| 敏感凭据被报告记录 | Playwright 默认截图/trace 或原始输入调用日志 | 登录敏感阶段固定错误文本，认证流程禁自动 trace/截图，只附白名单状态证据。 |
| 实测污染账号 | 测试使用操作者日常账号或自动改密吊销 | 仅允许明确提供的专用测试角色，禁止改密/递增版本清理。 |
| 合成结果冒充真实通过 | 无真实服务或凭据时运行框架回归 | 覆盖文档分别列出离线、合成、真实状态；缺前提如实失败。 |

## Gate

- [x] 共享层命中已完整列出
- [x] 与 interview 的冲突项已回写 interview.md
- [x] 可复用点已确认
