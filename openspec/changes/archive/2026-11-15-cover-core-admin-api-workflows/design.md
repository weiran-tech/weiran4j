---
title: "核心后台 API 测试设计"
status: "approved"
updated_at: "2026-11-15"
approved_by: "用户"
approved_at: "2026-11-15"
---

# Design

## Context

用户要求「写 api 的测试」。interview/explore 确定复用根 tests/，在现有健康/认证测试外新增核心业务 HTTP 流程；没有产品契约变更。用户已于 2026-11-15 回复「批准」，进入实施。

## 宪法对照

| 原则 | 判定 | 说明 |
|---|---|---|
| CP-1 领域层不依赖框架 | ☐ | 不修改 Java domain。 |
| CP-2 依赖方向单向向内 | ☐ | 测试只经公开 HTTP，不改 Java 依赖。 |
| CP-3 持久化类型不跨层 | ☐ | 不引用 DO/Mapper 或直接访问数据库。 |
| CP-4 版本号只有一个来源 | ☑ | 复用根已有测试依赖，不增加版本或锁文件。 |
| CP-5 质量规则只在 build-logic 里配置 | ☐ | 不改构建约定或质量门禁。 |
| CP-6 豁免必须最小且带理由 | ☐ | 不新增规则豁免。 |
| CP-7 表结构只经 Flyway 迁移变更，已发布的迁移永不修改 | ☑ | 无 DDL/迁移/种子变更；仅经现有 CRUD API 创建临时普通数据。 |
| CP-8 密码只用 BCrypt，令牌吊销只走 token_version | ☑ | 不改算法/版本机制；测试账号密码随机生成，不改操作者密码；普通登出不声称吊销。 |
| CP-9 凭据不进版本库、不进日志 | ☑ | 私有 0600 材料、白名单状态证据、认证自动 trace关闭；生成密码只在内存。 |
| CP-10 认证失败不泄露账号存在性 | ☑ | 使用现行统一错误码，不引入账号探测差异。 |
| CP-11 错误码归属决定 HTTP 状态，不靠 Controller 判断 | ☑ | 测试分别断言状态与数字业务码，不改 Controller。 |
| CP-12 依赖只能业务 → 基座 → 框架，反向与同层横向禁止 | ☐ | 不新增业务模块或模块依赖。 |
| CP-13 业务只经基座的 weiran-system-api 接触基座 | ☐ | 不访问内部层，测试只经 HTTP。 |
| CP-14 错误码按号段分配，业务不得占用框架与基座的号段 | ☑ | 只消费既有码，无新增错误码。 |
| CP-15 权限码、菜单 id 与 Flyway 模块段按层隔离 | ☑ | 不新增发布权限/菜单号段；临时菜单用现有 API 分配 ID，不硬编码全局 ID 或新增权限定义。 |

## Architecture

统一 CLI/registry → Playwright API spec → API fixture/共享业务步骤 → 现有 HTTP Controller。会话工具继续使用 tests/framework/session.mjs，响应断言与资源清理作为测试共享层先冻结。全部单工作区串行推进，不使用子代理或 worktree。

新增流程保留 expectedCases=1，各流程用一个完整场景串联其必要状态变化，以 test.step 区分动作；不把任一失败步骤 skip 或降级。原有 7 条流程继续保留，注册总数变为 15；旧回归的数量假设同步更新，不降低严格校验。

## Data Flow

1. 解析环境与 ALLOW_WRITE 参数；写流程必须值恰好为字符串 true，在读取凭据/登录或任何业务写入前拒绝其他情况。
2. API fixture 以专用测试账号创建隔离 Cookie jar，核验远端身份/权限；可选借用缓存时仍校验主体与环境，结束不删除外部拥有的缓存。管理员与临时被测用户分别使用独立 Cookie/CSRF。
3. 只读流程逐项核验结构，选取详情仅用读取返回的有效 ID；合法空列表不跳过整个场景，不要求环境固定记录数。非必要详情空分支在白名单状态中记录，无 skip。
4. 生命周期先生成不可预测、符合 DTO 长度/字符规则的唯一标记，精确确认不存在；写前持久化创建意图，收到 ID 后更新。请求不确定时不得重发 POST，而按同一唯一 key 精确查询。
5. 操作与后置读取验证完成后 finally 逆依赖清理；删除结果和匿名/会话清理分别验证。失败保留私有业务清单，且原始错误与清理错误都记录为脱敏失败。
6. 统一执行器验证 expectedCases/必需附件，原始结果和复核独立；真实与合成报告明确分开。

## 跨模块契约变更(DS-1)

| 对象 | 动作 | 消费方 |
|---|---|---|
| Java framework/system-api/前端 api.ts | 无生产契约变更 | 不修改 packages/ |
| 测试 API 会话与响应断言 | 新增共享 fixture，复用 Cookie 请求与私有 session 恢复；不依赖 Page/Chromium | 核心读取、五类生命周期、权限与地区流程 |
| 测试资源记录 | 私有 version/runId/env/两地址/actorId/随机唯一标记/资源类型/唯一 key/id/父级/创建意图/清理状态 | 写流程、finally 与专门恢复命令 |
| 流程注册/步骤索引 | 登记 8 条流程与间接共享步骤，不改变元数据 schema | CLI/deep check/原有回归 |

资源清单不保存密码、Cookie 或任意可执行 URL；恢复按固定资源类型映射既有 API。路径从校验后的 runId/环境生成，检查 symlink/权限/地址/主体；不接受任意文件路径。只能清理本次清单、唯一身份和父级都相符的普通记录，拒绝 builtin/操作者账号。恢复不做模糊前缀删除，不修改权限或密码来获得访问。

## API Design(DS-2)

只消费现有 Controller/DTO 生成的 OpenAPI；下表是测试使用点，不替代接口文档。所有成功 code 必须为数字 0；常见错误分别核对 400/100001、401/100101、403/100102、403/100103、404/100002、409/100003、409/100004、409/100007。

| 流程 ID（新增） | 使用的现有接口族 | 核心断言 | 数据副作用 |
|---|---|---|---|
| system/core-read | system/{user,role,menu,dict,config,loginLog,operationLog} 实际 Controller 声明的读取路径 | 分页/树/数组/详情；非法分页参数按现有 PageQuery 归一化或拒绝语义验证，不凭空要求一种结果；错误不以空数组代替 | 只有登录/退出审计 |
| system/user-lifecycle | system/user create/get/list/update/delete | 创建/检索/详情/更新、重复用户名409/100003、陈旧 version409/100007且新值保留、删除后404；不测试操作者改密 | 临时用户；可用临时普通角色，禁止 super_admin |
| system/role-lifecycle | system/role create/get/list/update/assignMenus/delete | 普通角色生命周期、重复编码、资料/菜单共用角色 version，分别验证版本递增与陈旧版本冲突；关联删除约束仅用本次资源 | 临时角色/关联 |
| system/menu-lifecycle | system/menu create/get/list/update/delete | 临时目录/子目录或按钮、合法更新、陈旧版本、成环/非叶删除拒绝、由叶至根删除 | 临时目录/按钮，不引用真实页面 |
| system/dict-lifecycle | system/dict 字典及 item 系列 | 重复编码/项值、排序/启用项过滤、更新与级联删除验证 | 临时字典及项 |
| system/config-lifecycle | system/config 分组/条目 CRUD 与 n/system/config/getPublic | 自建非内置分组和配置；自建配置匿名读取被拒或不存在；白名单 system.general.title 仅读取核验，更新/删除自建配置 | 临时分组与配置，无真实密钥 |
| system/permission-boundary | role assignMenus、user CRUD、auth本人/授权快照、受权限保护的读取接口 | 引用现有 system:user:list 权限对应菜单；同一临时用户允许用户列表、拒绝角色列表；撤回该临时角色授权后用户列表403/100102，修订变化 | 临时普通用户和角色，引用的菜单只读 |
| region/read | n/region/area/getEnabledTree，region/area listTree/list/getEnabledTree/get | 公开匿名成功，管理匿名拒绝；后台数组/树、code/parent/level/status等实际字段；如有合法详情则一致，不写地区数据 | 只有登录/退出审计 |

已有 system/access-boundary 扩充核心受保护读取路径，保持匿名上下文且不误将公开接口要求401。具体日志路由大小写及 DTO 字段必须从 Controller/DTO 读取，不按上表简写拼接。

测试账号需拥有上述管理权限；身份/权限不足视为前提失败。权限流程使用菜单读取中 permission 精确匹配已有定义；不存在该权限定义时失败，不能新建一个权限来掩盖前提问题。临时角色自身不含 super_admin。

### 私有恢复与执行入口

- `pnpm test:flows run <id> --env local`：只读流程可直接运行，专用密码凭据前提与现有机制一致。
- `FLOW_ALLOW_WRITE=true pnpm test:flows run system/user-lifecycle --env local`：显式写入；ALLOW_WRITE 为各写流程声明参数，无默认 true，不含秘密。
- `FLOW_ALLOW_WRITE=true pnpm test:api`：执行全部已登记 API；需预先启动真实 API，无需后台 UI。新 API fixture 不借用页面 fixture。
- `FLOW_ALLOW_WRITE=true pnpm test:api:cleanup --env local --run-id <id>`：独立恢复入口，只执行本次私有清单中确认拥有的数据删除；重新使用专用管理员凭据建立会话，绝不重放创建或更新业务数据。普通 session recover 仍仅处理会话材料。
- 超时/取消可能阻止 finally 完成，资源清单必须在写前创建，后续恢复可精确核对；无法证明归属时停止而非尝试批删。

## Database Design(DS-3)

无表结构、Flyway或种子变化，不直接连接 MySQL。业务运行时临时资源通过现有 API 创建；没有手写 DDL、SQL清理或硬编码种子 ID。保留登录与操作审计日志，不宣称业务测试完全无副作用。

## 权限与已知缺口(DS-4)

权限测试只修改本次临时角色与用户；已有菜单/权限定义只读。临时菜单采用目录/按钮类型，按钮引用已有权限定义或允许的空权限，不创建产品新的 permission。新建菜单始终禁用并不授予既有角色，避免出现在其他用户导航中；菜单树规则通过管理 API 验证。

不修改生产 @RequiresPermission/@OperationLog；测试账号需要显式拥有管理能力，不能自动提权。数据范围、多租户和统一幂等产品协议未引入；不声称完成这些覆盖。文件/媒体/批处理、短信/MFA/SSO、地区写入/导出与完整角色组合留给后续。

## 分层与装配(DS-5)

仅测试工具分层：API fixture 管会话，公共 helper 管协议/私有资源清理，shared steps 管业务断言，spec 管流程/证据。所有业务观测与清理经公开 HTTP；不引入 Java/数据库依赖，不改自动配置或应用装配。地区流程独立在 region 下，核心 helper 无地区模型依赖。

## 前端设计(DS-6)

不修改后台页面/组件/路由/类型。docs/testing.md 同步 API 覆盖、只读与显式写入、私有恢复命令与执行边界。没有新增组件演示需求，已有 docs 演示不变。

## Observability

普通证据只保存执行类型、断言布尔值、数量、测试专属标识和清理结果，不保存真实用户/配置/日志整条内容、密码或 Cookie。所有新增认证 API spec 禁用自动 trace/video/screenshot，错误固定脱敏；生成临时密码只留内存，恢复删除不需要该密码。

写流程提供 before-state/after-state/cleanup-state；只读流程提供契约摘要与会话清理摘要。清理失败令用例失败并保留 0600 清单，普通错误只提示 runId 与恢复入口。原始业务断言和清理错误都保留非敏感原因，不用 finally 的成功掩盖前一失败。中断恢复与结果不能被写成业务回滚成功。

## Test Plan

| 层级 | 验证 | 命令/证据 |
|---|---|---|
| 离线步骤/工具 | 数字code、schema缺失/空结果、旧版本、CSRF、Cookie隔离、缺授权开关、清理失败、清单/链接篡改、不确定创建、敏感哨兵 | pnpm test:flows:check，新增 Node 回归 |
| API 合成装配 | 实际 CLI 执行8新增流程与扩充匿名矩阵；替身提供对应路径与状态，不接真实数据库 | 独立 pnpm test:api:synthetic；随机端口，finally关闭；明确合成标识 |
| 原有框架 | 既有7流程与Chrome框架回归；数量断言按目录选择调整，不削弱strict | pnpm test:flows:browser；旧单测 |
| 真实环境 | 专用凭据、明确环境；写入显式允许后执行；无前提记未运行 | doctor、逐流程 CLI 原生报告；不可拿合成报告冒充 |
| 工程 | JDK21先spotlessApply，project.json的build/test/lint完整串行；docs与规格 | exec/evidence中的本次日志 |

使用原有根依赖，不下载浏览器即可检查/执行新增 API。新合成入口属于测试验证，不自动启动已有业务服务。旧浏览器回归的最小测试目录固定选择其原有7个样本，新业务合成单独覆盖8个新增；发现检查仍验证完整15条，不删除新流程来过门禁。

## Rollout Plan

1. L3批准后建立测试共享fixture/响应/资源清理契约，冻结后串行完成8条业务流程与匿名矩阵。
2. 完成离线与合成装配、原回归、docs、L7；记录真实是否实际运行。
3. L9审阅最终差异，再原生CLI归档；提交/推送另行授权。

## Rollback Plan

1. 当前基线 26ca3c9；本change提交后仅 revert 对应提交，不重置其他变更。
2. 无迁移回滚。移除新增流程/fixture/恢复入口及文档、恢复registry数量假设即可恢复原测试行为。
3. Git回滚不能删除已创建的测试业务数据。先使用保留的私有清单正常清理；需要保留工具到确认清理完毕。清理失败必须留清单，不用SQL或全前缀删数据。

## Open Questions

- 无。待用户批准本设计；真实账号与环境是执行前提，不写入仓库。

### 实施契约澄清

2026-11-15 核对 ConfigController.getPublic 与 SystemConfig.PUBLIC_KEY：仅白名单 system.general.title 可公开，无自定义公开开关。前表原「显式公开后」措辞与“只消费现有API/不修改既有数据”的既定意图矛盾，已补清为自建配置拒绝匿名读取、内置白名单仅读。未增加产品行为或修改既有配置；L8需按真实契约验收。

角色契约澄清：RoleDetailView仅有一个version，RoleApplicationService.assignMenus与update共用此并发边界；前述“独立”指分别验证两类动作，不新增独立版本字段。测试按实际共享版本拒绝旧草稿，不改产品契约。
