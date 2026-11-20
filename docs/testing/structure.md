# 工作区与声明

## 目录边界

测试工作区使用项目根依赖与唯一 pnpm 锁文件，不在 `tests/` 或 `framework/` 中独立安装。

```text
tests/
├── api/<领域>/<流程>/       # Playwright API 流程
├── e2e/<领域>/<流程>/       # 页面流程
├── bruno/                  # OpenCollection YAML 请求与桌面环境
├── support/
│   ├── fixtures/           # 匿名、认证、资源上下文
│   ├── steps/              # 共享业务动作与 INDEX.md
│   ├── helpers/            # 环境、白名单证据、多页面等工具
│   └── api/                # 项目协议、资源所有权与恢复适配
├── unit/                   # 共享业务步骤、适配器的离线回归
├── synthetic/              # 独立 API 合成服务回归（按项目需要提供）
├── framework/              # 执行器、模板、框架 unit/browser 回归
├── docs/                   # 项目使用说明、协议和覆盖边界
├── envs/                   # 非秘密地址与入口配置
├── registry.json           # flow.json 路径清单
├── playwright.config.ts
├── tsconfig.json
├── .local/                 # 忽略的凭据、会话、恢复清单
└── .artifacts/             # 忽略的目录、批次、报告与附件
```

每条流程的 `flow.json`、`plan.md` 和 spec/请求同目录。稳定 ID 是查询与执行标识，移动目录不应顺便更改 ID。registry 只登记声明路径，不复制流程元数据。

`framework/unit` 验证执行器，`tests/unit` 验证业务步骤与适配器；两者都不是业务 API/E2E 执行结果。`support` 包含项目集成代码，不整体当成可覆盖的公共骨架。

## 流程声明

| 字段 | 约定 |
| --- | --- |
| `version`、`businessProject` | 声明格式版本与项目归属；合法值由项目校验器约束 |
| `id`、`title` | 唯一 `domain/name` 与可读标题 |
| `runner`、`entry` | `playwright` 或 `bruno`，入口相对 tests |
| `project` | Playwright 类型：`api` 或 `e2e`；CLI 使用 `--type` |
| `kind` | `read-only` 或 `transition` |
| `envs`、`params` | 支持环境、参数说明、必填性与秘密属性 |
| `expectedCases` | 工具实际发现的用例或请求数量，不是断言数量 |
| `tags` | 流程级检查意图，可以为空数组 |
| `preconditions`、`verification`、`limitations` | 真实前提、可观察判据与未验证边界 |
| `steps`、`inputs` | 实际共享步骤与额外本地输入，参与指纹和依赖检查 |
| `cleanup`、`evidence.requiredAttachments` | 清理说明与每个用例的必要附件 |
| `blockedReason` | 已知缺失前提；保留发现检查，执行时单列阻塞 |
| `portal`、`modularityNote` | 项目支持的页面入口与必要的拆分取舍说明 |

当前框架拒绝未知字段、越界路径、重复登记、多个流程共用 entry、未声明参数和不一致数量。秘密参数不能设置默认值，普通记录只保存参数名。

## 标签

| 标签 | 纳入标准 |
| --- | --- |
| `smoke` | 快速确认核心入口与最小运行条件；默认范围应明确且稳定 |
| `critical` | 项目明确认定的关键回归流程；不能绕过写入或账号前提 |
| `permission` | 匿名拒绝、授权允许/拒绝、主体隔离或权限变化 |
| `validation` | 入参、响应契约、分页、字段和边界校验 |
| `security` | 认证、会话和敏感材料保护等安全专项 |

类型、工具、领域、环境、角色、draft/blocked 等状态使用已有字段，不重复贴标签。新模板默认空标签；新增标签需同步校验器与纳入标准。

标签选择整条流程，不选择流程中的部分用例。执行频率或前提不同的场景应拆分流程。标签与 `--type`、`--runner`、稳定 ID 取交集。

## 指纹与适配

步骤检查使用 AST 和模块解析，核对实际间接引用、manifest 与 INDEX，拒绝漏声明、无引用声明、孤立步骤和失效索引。动态 import/require 应使用可追踪的字面量路径。

流程指纹包含入口、计划、声明、实际本地依赖、框架模块、测试配置、根依赖与锁文件；配置继承也须纳入。文件变化后，历史证据保留并提示版本差异，不代表当前代码通过。

认证协议、接口路径、健康语义、业务码类型和具体资源 API 由项目适配。具体工具版本以项目声明与锁文件为准，不能从文档存在推断已验证运行环境。

## weiran4j 适配基线

本仓成功业务码是数字 `0`，认证采用 HttpOnly Cookie 与 CSRF，普通登出不吊销旧 JWT；业务断言和资源适配须遵守本仓契约。环境入口、账号注入及当前支持资源见[项目测试入口](../testing.md)，接口字段以 OpenAPI 为准。
