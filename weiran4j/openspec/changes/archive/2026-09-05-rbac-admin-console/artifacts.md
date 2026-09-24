# RBAC 后台管理控制台 · 验收摘要

> 本文件是给人读的验收摘要，只写 `exec/verify.md` 没有的内容：范围说明、运行时验证的实际操作与结果、已知缺口。逐条核对表、L7 证据表、验证结论详见 `exec/verify.md`。

## 这次做了什么

按 docs/10-模块映射.md 的复刻计划，交付第一个 openspec change：RBAC 后台管理模板（角色管理 + 账号管理 + 封禁管理），作为后续 P1/P2/P3 业务模块复刻的样板。

- **Java 后端**：五层架构新增角色/账号/封禁三个管理用例，18 个 REST 端点，7 个新权限点，全部复用既有五张 `pam_*` 表（不做任何 ALTER）。
- **前端**：首次真正引入 Semi Design 组件，搭出通用后台布局壳子（AdminLayout），三个业务页面（列表 + 表单弹层 + 删除 + 权限树分配等交互）。

## 运行时验证的实际操作

除自动化测试外，做过的手工/运行时验证：

- `./gradlew check` 全量跑过，确认编译、Checkstyle、SpotBugs、Forbidden APIs、Error Prone/NullAway、覆盖率全绿。
- `RbacAdminEndpointIT`（6 个用例）真起 Spring 容器、真连 H2 数据库、真发 HTTP，验证了三个 Controller 的完整闭环（新增→查询→编辑→删除等）、权限拦截真的生效、系统内置角色保护生效、账号重复标识拒绝新增。这个过程中发现并修复了 5 个真实缺陷（详见下方"已知缺口与本次修复"）。
- 前端 `npx vite build` 验证生产构建产物能正常生成。
- 前端未做真实浏览器手动点击验证（受限于当前会话没有浏览器环境），只验证了 `tsc --noEmit`、`eslint`、组件测试（Vitest + Testing Library，jsdom 环境）。

## 本次修复的真实缺陷（实现/测试阶段发现，非预先规划）

1. H2 测试数据库的 `pam_ban.value` 列名与 SQL 保留字冲突，导致集成测试容器起不来（schema.sql 语法错误）。
2. MyBatis-Plus 自动生成的 SQL 未对 `value`（`pam_ban`）/`group`（`pam_permission`）两个保留字列名做转义，即使 schema 定义加了引号，实际执行的 INSERT/UPDATE/SELECT 仍会失败——已给对应 DO 加 `@TableField` 注解修复。
3. `pam_ban.note` 是 `NOT NULL DEFAULT ''`，但封禁记录的新增/编辑用例把可空的 `note` 直接透传，未填写时触发数据库约束违反——已在 `MyBatisBanRepository` 补上 `orEmpty()` 规整。
4. 测试代码自身的密码字面量不一致 bug（与被测代码无关）。
5. Semi Design 的 `Avatar` 组件在 jsdom 测试环境下因缺少 Canvas 2D 支持而崩溃（`lottie-web` 依赖）——已在 `web/src/test-setup.ts` 打 stub 修复，非本项目代码缺陷。

这些缺陷全部是通过端到端集成测试和真实组件渲染测试发现的，纯 mock 化的隔离单测测不出来——这也印证了 design.md/exec/plan.md 里"应用服务用例编排不做隔离单测（无 Mockito 依赖），改由集成测试覆盖"这个决定是合理的。

## 已知缺口（留给后续处理，非本次范围）

- **Token 会话管理**（会话列表/强制下线）、**手机号绑定/解绑**：interview.md 已明确排除，留给后续 change。
- **账号-角色分配的具体 UI 入口**：design.md 的 Open Question，DO/Mapper 层已建模（`PamRoleAccountMapper`），但应用层/前端未实现绑定操作的用例——需要先确定放在账号管理页面还是角色管理页面。
- **权限点录入需要人工执行**：`exec/permission-seed.sql` 已产出，需要在目标环境替换 `<SUPER_ROLE_ID>` 占位符后手动执行；`tasks.md` 0.2（确认目标环境已有 `system=true` 管理角色）同样需要连接真实数据库才能核实，本地开发阶段无法完成，需在发布前由运维/负责人确认。
- **前端未做真实浏览器验证**：仅验证了构建产物生成、类型检查、lint、jsdom 环境下的组件测试，未在真实浏览器里手动操作过登录→进入后台→角色/账号/封禁管理的完整用户旅程。
- **前端体积优化**：单 chunk 1.47MB（gzip 404KB），design.md 已确认本次刻意不做按需加载/分包，等首屏体积真正成为问题再处理。
- **`MyBatisRoleRepository`/`MyBatisAccountRepository`** 是否存在类似"可空字段写入 NOT NULL 列"的同类隐患未做穷举式排查（E6 收尾笔记已记录）。

## 后续模块复刻可复用的样板

design.md 和本次实现沉淀的模式，供后续 P1（area/sms/oss）等模块 change 直接复用：

- **Java 五层建模模式**：可编辑聚合根与只读投影分离（如需要）、`weiran-common` 分页/错误码复用、模块自装配（`@Import` + `@ConditionalOnMissingBean`）。
- **REST API 设计规范**：POST 语义化路径（不用 PUT/DELETE）、权限点命名 `weiran-system:{resource}.{action}`、Controller 内显式调用 `PrincipalHolder.require().ensure(...)` 做权限拦截。
- **Semi 后台页面模式**：列表页（Table）+ 表单弹层（Modal + Form）+ 删除（Popconfirm）+ 权限点绑定隐藏入口（`hasPermission()`），暂不抽象通用组件，先观察出稳定模式。
- **MyBatis-Plus 保留字踩坑经验**：任何新表字段若与 SQL 保留字同名（`value`/`group`/`type` 等需要留意），必须用 `@TableField` 显式转义，不要假设裸列名在所有数据库方言下都安全。

详见 `exec/verify.md` 的完整核对表与最终结论。
