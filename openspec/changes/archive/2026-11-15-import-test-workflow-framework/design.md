---
title: "迁入并适配测试工作流框架"
status: "approved"
updated_at: "2026-11-15"
approved_by: "用户"
approved_at: "2026-11-15"
---

# Design

## Context

需求与范围见 interview.md，现状依据见 explore.md。源项目 tests/ 提供执行器和完整回归，但使用阿琅的旧 Bearer 主体协议。当前项目需要数字 code、HttpOnly Cookie、CSRF 和动态授权快照；设计不改变任何产品认证语义。

## 宪法对照

| 原则 | 判定 | 说明 |
|---|---|---|
| CP-1 领域层不依赖框架 | ☐ | 不修改 Java domain 或引入框架依赖。 |
| CP-2 依赖方向单向向内 | ☐ | 不改变 Java 分层或依赖方向；测试仅经 HTTP 消费。 |
| CP-3 持久化类型不跨层 | ☐ | 测试不使用持久化 DO、Mapper 或 Wrappers。 |
| CP-4 版本号只有一个来源 | ☑ | 测试依赖版本集中在根 package.json 与唯一 pnpm-lock.yaml，不改 Java BOM。 |
| CP-5 质量规则只在 build-logic 里配置 | ☐ | 不修改 build-logic 或降低现有质量门禁。 |
| CP-6 豁免必须最小且带理由 | ☐ | 不增加质量规则豁免。 |
| CP-7 表结构只经 Flyway 迁移变更，已发布的迁移永不修改 | ☐ | 无表结构、菜单或种子修改，不创建 Flyway 脚本。 |
| CP-8 密码只用 BCrypt，令牌吊销只走 token_version | ☑ | 不修改密码算法或吊销机制，清理不递增 token_version，承认普通登出不吊销旧 JWT。 |
| CP-9 凭据不进版本库、不进日志 | ☑ | 私有凭据/Cookie/storageState/恢复材料仅存忽略目录，最小文件权限，证据不含敏感值。 |
| CP-10 认证失败不泄露账号存在性 | ☑ | 测试错误码按现有契约断言，不细分账号存在性。 |
| CP-11 错误码归属决定 HTTP 状态，不靠 Controller 判断 | ☑ | 消费现有 HTTP 状态与数字错误码，不添加错误或改写 Controller。 |
| CP-12 依赖只能业务 → 基座 → 框架，反向与同层横向禁止 | ☐ | 不新增业务模块或模块间依赖。 |
| CP-13 业务只经基座的 `weiran-system-api` 接触基座 | ☐ | 不访问基座内部 Java 实现；系统流程只使用公开 HTTP 能力。 |
| CP-14 错误码按号段分配，业务不得占用框架与基座的号段 | ☐ | 无新增错误码。 |
| CP-15 权限码、菜单 id 与 Flyway 模块段按层隔离 | ☐ | 无新增权限码、菜单 id、表或模块段。 |

## Architecture

- 根 pnpm 提供统一命令，tests/framework 管执行和报告，tests/api、e2e、bruno 只表达测试流程，support 管可复用步骤、fixture 与证据。
- 迁入源框架的 CLI、核心校验、AST 依赖发现、批次、进程组取消、脚手架、维护锁、报告、反馈、会话与恢复。移除阿琅限定，将本项目标识统一为 weiran4j；不引入跨项目同步/插件服务或第二个包管理入口。
- 当前根 `pnpm test` 保持 Vitest 语义，Gradle 测试独立保留。新增测试流程命令，不把真实账号流程纳入默认 test/build。
- Layer 0 固定根依赖、目录、注册表/步骤索引与 Cookie/证据契约；随后适配系统步骤、Bruno 与离线/合成回归。全部串行，不使用子代理或 worktree。

## Data Flow

1. CLI 根据注册表选择流程，校验声明、环境、参数、步骤与输入摘要；真实执行前检查必要服务和账号前提。
2. 生成批次摘要和独立 runId，调用 Playwright 或 Bruno。缺前提项仍进入摘要并失败，不回退模拟成功。
3. fixture 为匿名用例创建全新上下文；认证用例只从显式凭据登录或读取已验证的私有缓存。
4. 执行完成后严格核对期望用例、原生结果、附件及哈希；skip/flaky/降级/空跑/证据缺失一律失败；首次记录不可覆盖。
5. 清理本次创建的 Cookie 上下文和本地缓存；清理未完成时保留私有恢复记录并让流程失败。复用操作者提供的外部缓存不擅自清除其他测试所拥有的上下文。

## 跨模块契约变更(DS-1)

| 对象 | 动作 | 消费方 |
|---|---|---|
| Java framework、system-api、前端 api.ts | 无生产契约变更 | 现有应用不受影响。 |
| 流程声明、CLI、环境 | 保留源框架能力，以 weiran4j 为本地项目标识，环境只有 API/web 地址，不迁入独立 Actuator | CLI、fixture、系统步骤、脚手架、文档。 |
| 测试会话协议 | 私有缓存保存环境/角色/API/web 地址、主体 id/username、有效期与 Cookie storageState，禁止 alang_principal 和 Wuli3 头 | session/browser/认证 fixture 与恢复命令。 |
| 证据协议 | 原始结果与复核分开；敏感认证过程禁自动 trace/video/screenshot，状态证据只含白名单字段 | 批次/报告/系统流程与框架回归。 |

### 根命令

- `test:flows`：CLI，包含 list/check/doctor/run/review、历史统计/反馈、init/维护及会话登录、校验、清理/恢复入口；以迁入 CLI 的实际 help 为准统一文档。
- `test:flows:check`：声明、步骤、类型、用例发现、Bruno 语法 + Node 离线单测，不依赖真实服务。
- `test:flows:unit`、`test:flows:browser`：分别离线框架/系统步骤回归与 Chromium+合成服务回归。
- `test:api`、`test:e2e`、`test:bruno`、`test:integration`、`test:integration:list`、`test:integration:ui`、`test:flows:smoke`、`test:flows:doctor`：使用同一执行器，不新增旁路执行入口。
- 不照搬源项目 Turbo 根任务耦合；离线测试可直接由根脚本运行。依赖只放根 package.json：Playwright 1.65.0、Bruno CLI 4.3.0、TypeScript 6.0.3、@types/node 24.19.0；本仓 pnpm 重新生成唯一锁文件。

### Cookie 会话与恢复

- 浏览器登录经 web 同源代理，读取 browserContext.storageState() 获取 HttpOnly Cookie，不在页面脚本或 localStorage 读取令牌；API 登录使用默认 Cookie 模式，并维护隔离 Cookie jar，不额外请求 token 模式。
- 私有缓存持久化 token Cookie 的实际路径 `/api-backend`、HttpOnly、有效期以及 `weiran_csrf` 的路径 `/`；认证 HTTP 写请求从同一 jar 获取 CSRF 值并发送 `X-CSRF-Token`。
- 凭据仅从显式环境变量或 tests/.local/<role>.json 读取，不默认使用种子密码；角色/环境/地址绑定必须精确匹配。默认地址为 localhost:5200/5202；Cookie 复用要求可兼容的同一 hostname，不把 localhost 与 127.0.0.1 混用。
- 缓存校验除本地格式/有效期外，还经 getCurrentUser 或授权快照核验远端 id 与 username。401、身份不符、错误 host/role、损坏缓存均拒绝执行；5xx/连接错误不得解释为合法会话。
- 普通 logout 只清 Cookie 并记日志；退出成功后核验当前 Cookie 上下文匿名访问被拒，再删除对应缓存。不得拿旧 Cookie/JWT 重放被拒作为清理成功条件，因为当前服务并不吊销它；也不改密、禁用账号或递增版本来让断言通过。
- 恢复命令重做幂等的 Cookie/本地材料清理。网络错误保留私有恢复材料并失败；已失效会话可确认无可复用上下文后清理。正常清理不承诺服务端 JWT 即刻失效，文档明确其自然过期边界。
- MFA/短信/SSO 不在首批覆盖；专用密码账号需要符合测试前提，遇到待二次验证如实失败，不自动降级或关闭策略。

## API Design(DS-2)

只消费现有 Controller/OpenAPI，不新增或修改产品接口。下表仅说明测试使用点，不替代 OpenAPI。

| 已有能力 | 测试使用 | 关键断言 |
|---|---|---|
| GET /api-backend/n/health | Playwright 与 Bruno 存活流程、doctor | HTTP 200、数字 code 0、data.status=UP；不声称依赖健康。 |
| GET /api-backend/n/system/auth/listProviders | 登录入口前提探测 | 真实密码登录能力；不自动开启禁用的登录方式。 |
| GET /api-backend/system/auth/getCurrentUser | 匿名鉴权、缓存身份校验 | 匿名 401/100101，认证数字 0 且主体一致。 |
| GET /api-backend/system/auth/getAuthorizationSnapshot | API/浏览器会话 | user 与身份一致，menus 为数组，revision 为字符串；不要求非空菜单代表所有权限正确。 |
| POST /api-backend/n/system/auth/login | 只在明确提供账号时执行 | 默认 Cookie 模式，不泄漏请求体，认证失败使用现行错误码。 |
| POST /api-backend/system/auth/logout | 缺 CSRF 拒绝与正常登出清理 | Cookie 写请求缺 CSRF 返回 403/100103；正常登出清 Cookie，无凭据访问被拒。 |

首批固定 7 条：system/health、system/access-boundary、system/login-entry、system/admin-session、system/admin-browser、system/health-manual、system/access-manual。每条独立声明 expectedCases 与所需附件，不复制源项目的历史通过措辞。

## Database Design(DS-3)

无表结构、Flyway、菜单或种子变化。系统会话流程会按现有应用行为写登录/登出审计日志；这些是执行痕迹，不删除或宣称已回滚。首批流程不做业务 CRUD，不需要业务数据清理迁移。

## 权限与已知缺口(DS-4)

| 项 | 设计 |
|---|---|
| 权限码/菜单 | 不新增、不修改；测试消费现有菜单与角色。 |
| 写接口和操作日志 | 无新增写接口；登录/退出使用现有 sys_login_log。 |
| 账号管理 | 仅用操作者提供的专用账号，不自动创建角色、账号或修改密码。 |
| 未覆盖 | 首批不证明所有受限角色矩阵、短信/MFA/SSO、对象存储与业务 CRUD；docs 覆盖表明确。 |
| 其他横切 | 不引入数据范围、多租户、产品幂等键、导出中心或审批工作流。测试执行默认零重试。 |

## 分层与装配(DS-5)

测试是仓库根工具，不新增 Java 模块或依赖，不修改自动配置/imports。API/E2E 只经公开 HTTP 与真实页面访问，不绕过业务层直接写数据库。测试框架 modules 显式传 tests 根路径，避免工作目录改变后写错缓存/产物位置。

## 前端设计(DS-6)

不新增或修改后台页面、组件、路由、偏好或 API 类型。浏览器系统流程使用实际登录页和 `/profile`，确认同源代理、登录跳转、主体/授权快照与第二上下文复用。docs/testing.md 提供本地可执行命令与结果边界，并进入站点导航；页面/组件的交互演示仍在原 docs 入口。

## Observability

- 批次包含选择项、执行/阻塞/未执行原因；每项 runId、代码摘要、环境、期望/实际用例数和清理状态可追溯。
- tests/.artifacts/ 保存本次本地证据与报告，tests/.local/ 保存凭据、会话和恢复材料，均忽略；私有文件使用仅当前用户可读写权限。
- 认证输入失败统一替换为固定错误；Cookie、密码、请求头和完整 storageState 不写普通日志、附件或报告。对带认证的测试关闭自动 trace/video/screenshot。
- 报告/覆盖表分别标注离线通过、合成通过和真实未运行/通过/失败；doctor 不自动启动业务进程。

## Test Plan

| 层级 | 验证内容 | 计划命令/证据 |
|---|---|---|
| 离线框架 | 声明/AST/类型/发现/Bruno 语法、脚手架/删除/锁/批次/报告、session 负例 | pnpm test:flows:check |
| 协议装配 | 数字 code、Cookie jar/CSRF、主体校验、缓存过期/错误角色/地址、清理/恢复、敏感哨兵无泄漏 | tests/framework/unit 与 tests/unit 回归 |
| 合成浏览器 | Chromium + 隔离随机端口 HTTP 服务，Cookie 属性、页面登录/缓存复用/失败/清理、异常取消与证据 | pnpm test:flows:browser；合成服务须 finally 释放 |
| 系统发现 | 仅 7 条适配流程，无合同/返利/STS 和旧认证协议 | pnpm test:flows list、test:integration:list |
| 真实系统 | 有操作者提供的专用账号与明确环境时执行；无前提则文档明确未运行，不能用合成冒充 | doctor、匿名 smoke、API/浏览器会话流程原生报告 |
| 原有门禁 | project.json 的 build/test/lint，Gradle 用 JDK21，执行前先 spotlessApply | 串行执行并记录新 change 的 L7 证据 |
| 文档与规格 | docs 构建、工作流 YAML 校验、OpenSpec 结构与规格检查 | pnpm build:docs、actionlint 或 YAML 解析、pnpm openspec:check |

CI 新增独立 Node 24 离线 job，仅安装根依赖并执行 test:flows:check；既有 JDK21/前端/规格三类检查保留。真实认证和需要 Chromium 的合成回归独立运行，不向普通 CI 注入凭据或启动业务服务。

## Rollout Plan

1. 设计经 L3 批准后，先建立通用框架与会话/证据契约，再适配 7 条系统流程及回归。
2. 更新根依赖与唯一锁文件，执行离线检查及合成浏览器回归，保留旧 Vitest/Gradle 行为。
3. 完成 L7 与 docs/CI 校验，记录真实流程是否实际运行、前提与结果。
4. L9 审阅最终差异后用原生 OpenSpec CLI 归档；提交/推送等用户另行要求。

## Rollback Plan

1. 当前回滚基线为 f8f996c；实现提交后以本 change 对应提交执行 git revert，保留其他变更。
2. 无数据库迁移，无业务数据回滚；移除新增 CI/job/脚本/工具依赖恢复原测试入口。
3. 私有凭据/会话/证据不随 Git 回滚自动删除；操作者可按文档清理 tests/.local/，保留需要审计的证据。明示旧 JWT 仍按原业务 TTL 过期。

## Open Questions

- 无。真实账号的具体值是执行输入，不写入设计或版本库。
