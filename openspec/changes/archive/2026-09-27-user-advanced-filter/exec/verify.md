---
title: "用户列表高级筛选补后端单字段查询 · 集成与校验"
status: "done"
updated_at: "2026-09-27"
---

# Verify

> **L6 集成 + L8 规格一致性**,一份文件两件事,顺序不可颠倒:先把并行成果并回来,再校验合并后的实现与规格是否一致。
>
> 执行者:参与过全部实现的 agent(orchestrator 本人按层串行完成 13 个执行单元),已通读 `exec/notes/*.md`。

---

# 一、集成记录(L6)

**并行方式**:单工作区,无并行集成
**执行单元数**:13 个(E0–E12,按 `exec/plan.md` 层序串行完成;仅供参考,不决定本节规模)

## 输入检查

- [x] 各执行单元的 `notes/*.md` 齐全(13 份)
- [x] Layer 0 已完成且契约未再变动(契约变更记录为空)
- [x] 自测通过(见各 notes「自测结果」)

## 重复实现消除

| 重复项 | 出现位置 | 保留 | 删除 | 调用方已改 |
|---|---|---|---|---|
| 「空白即不过滤、非法 40000」的枚举过滤解析 | `EnableStatus.filterOf`(weiran-common)与新增 `Gender.filterOf`(domain) | 两者都保留 | — | ☑ 不适用 |

> 判定:口径相同但分属两个枚举、两个模块;抽公共需改 `weiran-common`(共享层,Layer 0 / WT-2),与本 change 目标无因果关系,不合并。

## 被牺牲的方案

| 放弃的方案 | 来自 | 放弃理由 |
|---|---|---|
| 用 `Gender.of` 直接解析过滤参数 | E3 | `of(null)` 返回 `UNKNOWN`,「不传性别」会变成「只查未知性别」,默认列表静默缩水(违反 FR-005) |
| 角色过滤用 `join sys_user_role` + `distinct` | E5 | 一人多角色时重复行 / `total` 偏大;改分页计数风险更大。改用参数绑定的 `id in (subquery)` |
| `inSql` 拼接 `role_id` 字符串 | E5 | `Long` 虽无注入面,仍按参数绑定写(`apply` 的 `{0}`) |
| `UserQuery.basic(...)` 工厂方法 | E1 | 没有调用方,属多余代码,已删除 |
| 修改既有 `toTimeRange` 以支持整天边界 | E8 | 日志页的日期时间选择器依赖其原样格式化;新增 `toDayRange` |
| 页面测试里直接操作 DatePicker | E9 | jsdom 下不可靠;改为 `toQuery` 单测 + 真浏览器验证 |
| 参数名 `id` / `createdFrom` | E0 | `id` 与路径参数 `/{id}` 易混;`createdFrom` 与日志接口 `startTime/endTime` 风格不一致 |

## 越界修改汇总

| 文件 | 申报单元 | 性质 | 处置 |
|---|---|---|---|
| (无) | — | 13 份 notes 均申报「无越界」 | — |

---

# 二、规格一致性(L8)

## 前置条件:L7 硬闸门

| 检查(commands 的键) | 命令 | 结果 | 证据 |
|---|---|---|---|
| `build` | `(cd weiran4j && JAVA_HOME=${JAVA_HOME_21:-$(/usr/libexec/java_home -v 21)} ./gradlew assemble --no-daemon) && pnpm --filter @weiran/web build` | ☑ 绿(exit 0;`BUILD SUCCESSFUL`、`✓ built`) | `evidence/build.log` |
| `test` | `(cd weiran4j && JAVA_HOME=${JAVA_HOME_21:-$(/usr/libexec/java_home -v 21)} ./gradlew test --no-daemon) && pnpm --filter @weiran/web test` | ☑ 绿(exit 0;后端 `BUILD SUCCESSFUL`,前端 26 files / 215 tests passed) | `evidence/test.log` |
| `lint` | `(cd weiran4j && JAVA_HOME=${JAVA_HOME_21:-$(/usr/libexec/java_home -v 21)} ./gradlew check --no-daemon) && pnpm --filter @weiran/web lint` | ☑ 绿(exit 0;`./gradlew check` 含 Checkstyle / SpotBugs / Forbidden APIs / Error Prone+NullAway / 覆盖率) | `evidence/lint.log` |

> 三条均在代码全部改完之后、按 `project.json` 原文依次串行执行(未并发两个 `check`);`node openspec/check.mjs` 的 `L7/evidence-fresh` 通过。
> 全绿,无红灯需要归因,未执行 `git stash` 基线对比。

## tasks.md 逐条核对

| tasks.md 条目 | 执行单元 | 实现位置 | 一致 |
|---|---|---|---|
| `0.1` 契约 §6.2 | `E0` | `weiran4j/docs/01-架构与接口契约.md` §6.2 参数表 | ☑ |
| `2.1` `UserQuery` 字段 | `E1` | `weiran-system-api/.../user/UserQuery.java` | ☑ |
| `2.2` `UserCriteria` 字段 | `E2` | `weiran-system-domain/.../user/UserCriteria.java` | ☑ |
| `2.3` `Gender` 过滤解析 | `E3` | `weiran-system-domain/.../user/Gender.java:46` | ☑ |
| `3.1` 应用服务规范化 | `E4` | `weiran-system-application/.../user/UserApplicationService.java:81` | ☑ |
| `3.2` 仓储查询条件 | `E5` | `weiran-system-infrastructure/.../persistence/MybatisUserRepository.java:203-215` | ☑ |
| `4.1` Controller 参数 | `E6` | `weiran-system-adapter/.../web/UserController.java:48-80` | ☑ |
| `5.1` 前端 `UserQuery` | `E7` | `web/src/types/api.ts` | ☑ |
| `5.2` 日期边界工具 | `E8` | `web/src/utils/date.ts:19` | ☑ |
| `5.3` 面板 10 个字段 | `E9` | `web/src/pages/system/users/UsersPage.tsx:55`(`toQuery`)、面板 `SearchField` ×10 | ☑ |
| `5.4` 已选条件 | `E10` | `web/src/pages/system/users/UsersPage.tsx:79`(`formatDayRange`)、`conditions` | ☑ |
| `5.5` 并入搜索栏改造 | `E11` | `web/src/components/SearchToolbar.tsx`、`web/src/styles/global.css` | ☑ |
| `5.6` 文档同步 | `E12` | `openspec/rules/advisory/components.md`、`openspec/state/bizs/sys_user.md` | ☑ |
| `6.1` Gender 单测 | `E3` | `UserTest.java:103` `parsesGenderFilter` | ☑ |
| `6.2` 集成测试 | `E5` | `UserRoleIT.java:145` `advancedFilters` | ☑ |
| `6.3` 前端测试 | `E8` / `E9` / `E10` | `utils/__tests__/date.test.ts`、`UsersPage.test.tsx` | ☑ |

### 未实现条目

| 条目 | 原因 | 是否已在 plan.md 声明 |
|---|---|---|
| `7.1` 先发布后端 | 部署动作,仓库外执行 | ☑ |
| `7.2` 再发布前端 | 同上 | ☑ |
| `8.1` `artifacts.md` | 上线后声明性条目 | ☑ |

## design.md 一致性

| design 章节 | 设计要求 | 实现情况 | 一致 |
|---|---|---|---|
| 宪法对照 | CP-1/2/3/11 符合,其余不涉及 | domain 只引 JDK / weiran-common;持久化类型只在 `MybatisUserRepository`;非法值经 `BizException` / 全局异常处理器,Controller 不写状态码;无 Flyway、无新依赖、无豁免 | ☑ |
| API Design | 10 个新参数、口径与非法值 | 与契约 §6.2 表逐项一致;`userId=abc`、`gender=x`、`createdStartTime=2026-13-01` 集成测试返回 40000 | ☑ |
| Database Design | 不改表、不加索引、角色子查询 | 无迁移脚本;`apply("id in (select user_id from sys_user_role where role_id = {0})")` | ☑ |
| 权限与已知缺口 | 沿用 `system:user:list`;禁用角色下拉不可选 | 未新增权限码;缺口已写入 `sys_user.md` 筛选项表 | ☑ |
| 前端设计 | 面板 10 字段、顶栏关键字不进面板、`toDayRange`、可读标签 | 一致;真浏览器验证日期范围发出 `00:00:00` / `23:59:59` | ☑ |
| Observability | 不新增日志 | 未新增日志输出 | ☑ |
| Rollout | 先后端再前端 | 记入 tasks 7.1/7.2 与 `artifacts.md`(待上线后) | ☑ |

## specs 验收标准核对

| spec / Scenario | 验收标准 | 验证方式 | 通过 |
|---|---|---|---|
| FR-001 用户名精确匹配不命中前缀 | `username=前缀` 不含 A,完整值恰为 A | `UserRoleIT.advancedFilters` | ☑ |
| FR-001 用户 ID 不存在返回空页 | `total=0` | 同上 | ☑ |
| FR-001 手机号与邮箱精确匹配 | 完整值命中、前缀不命中 | 同上 | ☑ |
| FR-002 多角色用户不重复 | `roleId=R1` 恰为 {A, B},`total=2` | 同上 | ☑ |
| FR-003 按性别过滤 | `gender=female` 全为 female、含 A 不含 B | 同上 | ☑ |
| FR-003 未传性别不改变结果 | `filterOf(null/空白)=null`;不带性别时 male 的 B 仍在 | `UserTest.parsesGenderFilter` + 集成 | ☑ |
| FR-003 非法性别值 | HTTP 400 / 40000 | 集成 | ☑ |
| FR-004 闭区间包含边界 | `start=end=A.createdAt` 命中 A;另验 `+` 编码的空格可解析 | 集成 | ☑ |
| FR-004 单边与空值 | 只传登录下界:未登录的 A 不在,登录后在;admin 在 | 集成 | ☑ |
| FR-004 时间格式非法 | 40000 | 集成 | ☑ |
| FR-005 多条件取交集 | `keyword&gender&roleId` 恰为 A;`keyword&gender=male` 为空 | 集成 | ☑ |
| FR-005 不传新参数行为不变 | 既有 `userCrud` 断言未改仍通过 | `evidence/test.log` | ☑ |
| FR-006 面板默认收起且字段齐全 | 10 个标签按序 | `UsersPage.test.tsx` | ☑ |
| FR-006 搜索发出对应参数 | `username/email/roleId/gender` 在请求中;时间边界 | 页面测试 + `toQuery` 单测 + 真浏览器 | ☑ |
| FR-007 可读值与移除 | 「角色：编辑」「性别：女」;移除后无 `roleId`、`page=1`、控件清空 | `UsersPage.test.tsx` | ☑ |

## 越界检查

`git status --short` 的改动文件(不含本 change 目录)共 18 个,逐一对照 `exec/plan.md` §5 的拥有文件:

| 文件 | 归属单元 | 实际改动方 | 是否申报 | 判定 |
|---|---|---|---|---|
| `weiran4j/docs/01-架构与接口契约.md` | `E0` | `E0` | —(本单元拥有) | 正常 |
| `UserQuery.java` / `UserCriteria.java` / `Gender.java` / `UserTest.java` | `E1` / `E2` / `E3` | 同左 | — | 正常 |
| `UserApplicationService.java` / `MybatisUserRepository.java` / `UserRoleIT.java` / `UserController.java` | `E4` / `E5` / `E6` | 同左 | — | 正常 |
| `web/src/types/api.ts` / `web/src/utils/date.ts` / `web/src/utils/__tests__/date.test.ts` | `E7` / `E8` | 同左 | — | 正常 |
| `UsersPage.tsx` / `UsersPage.test.tsx` | `E9` / `E10` | 同左 | — | 正常 |
| `SearchToolbar.tsx` / `global.css` | `E11` | 本会话此前改动,按 interview #6 并入 | —(interview 决策) | 正常 |
| `components.md` / `sys_user.md` | `E12`(并入部分亦含此前搜索栏改造的文档) | 同左 | — | 正常 |

结论:无未申报越界。

## 不一致项归属判定 ⚠️

| # | 不一致内容 | 判定 | 去向 |
|---|---|---|---|
| — | 未发现实现与 design / specs 的不一致 | — | — |

---

## 遗留问题

- [x] 角色下拉只列启用角色,前端无法按已禁用角色筛选(后端参数有效)——design 已接受;已写入 `sys_user.md` 筛选项表说明,不另开问题。
- [x] `email` / `phone` / 时间列无索引——interview「本次不决定」;后台管理量级可接受,暂不登记。
- [x] 本次关闭 `sys_user.md#08`:已整条移入该文件 §7 changelog 并注明由本 change 关闭。

## 流程反馈

- `templates/explore.md` 的「序号型资源(本仓库暂无)」一节文字已过时(本仓库实际用 Flyway),`templates/design.md` 宪法对照表的原则名(CP-7 / CP-8)与现行 `constitution.md` 不一致。均为流水线自身欠账,不在本 change 范围,建议记入 `openspec/design/README.md` 的流水线待办池。

## 结论

- [x] 集成完成(单执行单元时:越界汇总已写)
- [x] L7 三项全绿
- [x] tasks.md 条目全部覆盖或已声明
- [x] design/specs 一致
- [x] 无未申报越界
- [x] 不一致项已全部归属并处置完毕

**判定**:☑ 通过,进入 L9 人类审阅 diff
