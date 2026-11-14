---
title: "权限与设置恢复验收"
status: "ready"
updated_at: "2026-11-14"
---

# Verify

# 一、集成记录(L6)

单工作区、单执行单元，无并行集成。已读取 exec/notes/E1-frontend.md；全部任务完成，共享层零命中且既有契约未变。

## 重复实现消除

读取前置与错误呈现统一到 queriesReady / QueryReadiness，页面及 docs 共用；错误 Banner 沿用 ListFeedback。

## 被牺牲的方案

- 不按数组长度判定权限已加载，保留成功空权限。
- 不以页面重载恢复查询，不清空全部缓存，保留用户草稿和既有 Query 生命周期。
- docs 共用实际判定/反馈与 Permission，本地场景数据不发业务请求，无需引入 QueryClient 或真实角色。

## 越界修改汇总

无新增越界。实际前端、docs、AGENTS.md、组件登记与现状文档均在 E1 归属内。保留此前审查的 artifact.md#22、sys_user.md#11 与用户既有 sys_task、部署手册、批处理迁移改动，不把它们算作本次实现。

# 二、规格一致性(L8)

## 前置条件:L7 硬闸门

| 检查 | 命令 | 结果 | 证据 |
|---|---|---|---|
| build | `(cd packages/server && JAVA_HOME=${JAVA_HOME_21:-$(/usr/libexec/java_home -v 21)} ./gradlew assemble --no-daemon) && pnpm --filter @weiran/manage build` | ✅ exit 0 | `evidence/build.log` |
| test | `(cd packages/server && JAVA_HOME=${JAVA_HOME_21:-$(/usr/libexec/java_home -v 21)} ./gradlew test --no-daemon) && pnpm --filter @weiran/manage test` | ✅ exit 0 | `evidence/test.log` |
| lint | `(cd packages/server && JAVA_HOME=${JAVA_HOME_21:-$(/usr/libexec/java_home -v 21)} ./gradlew check --no-daemon) && pnpm --filter @weiran/manage lint` | ✅ exit 0 | `evidence/lint.log` |

源码最终修改后执行以上原命令，JDK 21，spotlessApply 在前；全绿，无需存量红灯归因。Gradle 按正常增量构建复用 UP-TO-DATE 任务。前端 48 个文件、363 个用例全部通过，其中本次新增 19 个；docs 另经 pnpm build:docs 构建通过（evidence/docs.log）。现存打包体积与依赖模块指令提示不阻断构建。

## tasks.md 逐条核对

| tasks.md 条目 | 执行单元 | 实现位置 | 一致 |
|---|---|---|---|
| 5.1 | E1 | RoleMenuSheet、QueryReadiness | ✅ |
| 5.2 | E1 | SecuritySettingsPage、UploadSettingsPage | ✅ |
| 5.3 | E1 | hooks/queries/roles.ts | ✅ |
| 5.4 | E1 | docs/page-states.md、PageStateDemoReact、Vue 桥接、导航、AGENTS.md、components.biz.md | ✅ |
| 5.5 | E1 | sys_role.md#01/#06、sys_config.md#06 移入 changelog，现状同步 | ✅ |
| 6.1 | E1 | RoleMenuRecovery、ReadRecovery、roles-refresh 三个测试文件 | ✅ |
| 6.2 | E1 | evidence/*.log、browser.json，桌面与移动端截图人工检查 | ✅ |

未实现条目：无。

## design.md 一致性

| design 章节 | 设计要求 | 实现情况 | 一致 |
|---|---|---|---|
| Architecture / 前端设计 | 共享前置，错误重试与草稿保护 | 查询成功且未刷新才开放，处理器同样保护 | ✅ |
| 当前会话权限同步 | 角色成功刷新当前 me/menus | 三个 hooks 四类写入成功并行失效，失败不失效 | ✅ |
| API / Database Design | 契约、表与迁移不变 | 后端无本次修改 | ✅ |
| docs 演示 | 本地数据，共用实际逻辑，无业务接口 | 四个场景、ClientOnly、卸载清理、真实 Permission | ✅ |
| Observability | 持续错误、不记录敏感信息 | 上下文错误标签与重试，无新增敏感日志 | ✅ |

## specs 验收标准核对

| spec / Scenario | 验证方式 | 通过 |
|---|---|---|
| FR-005 角色变更后同步当前界面权限 | 4 类成功用例活动 useMe/useMyMenus 重取，实际 Permission 与导航隐藏 | ✅ |
| FR-005 角色写入失败保持已有身份快照 | 4 类失败用例断言 invalidateQueries 未调用，身份只读取一次 | ✅ |
| FR-005 种子菜单的组件全部存在 | 原 page-registry 单测随完整测试执行 | ✅ |
| FR-016 任一依赖失败禁止误保存 | 菜单树/详情分别失败、延迟详情、缓存刷新失败，写请求保护及重试 | ✅ |
| FR-016 合法空权限允许保存 | 成功空权限和用户清空后刷新失败恢复均提交空数组 | ✅ |
| FR-017 安全设置读取失败后恢复 | 首次失败、重试、缓存刷新失败、抽屉草稿保留并恢复提交 | ✅ |
| FR-017 上传设置任一必要查询失败后恢复 | 两依赖分别首次/刷新失败，单独重试，草稿保留并提交 | ✅ |
| FR-018 文档站切换并恢复页面状态 | Chromium 验证四场景，业务请求0、脚本错误0；1440/390px截图正常且无水平溢出 | ✅ |

AC-1 至 AC-7 均由以上测试、docs 构建与 browser.json 记录支持。内置 CUA 不可用，实际浏览器验证使用本机 headless Chromium；未将临时 Playwright 加入项目依赖。

## 越界检查

逐项比较 git status（包含新增文件）与 plan 文件归属，除执行前已存在的改动外，无未申报越界。没有改动后端代码、依赖锁或其他业务页面。

## 不一致项归属判定

无实现/设计不一致。初次测试直接在 invalidateQueries 返回后同步断言，早于订阅通知；改为等待可见错误再检查禁用。身份失败测试最初将偏好设置读取计入身份请求；补齐该已有 Provider 接口模拟并精确检查 me/menus。均为测试同步/计数修正，不改变设计或降低判据。

## 遗留问题

- 上传配置逐项写入可能部分成功，已登记 sys_config.md#05，继续保留。
- 前端错误边界、窄屏关键字查询问题已登记 artifact.md#22、sys_user.md#11，未扩大到本轮。
- 身份同步范围为本会话发起的角色写入；其他会话和历史演示全量迁移属于已明确排除范围。

## 流程反馈

无分层缺陷。apply 提示中的其他项目命令不适用，遵循本项目 project.json 执行门禁。

## 结论

- [x] 集成完成，越界汇总已写
- [x] L7 三项全绿
- [x] tasks 全覆盖
- [x] design/specs 一致
- [x] 无未申报越界
- [x] 不一致项已处置

**判定**：通过，进入 L9 人类审阅 diff。

## L9 审阅记录

用户于 2026-11-14 回复「归档」，批准本次最终变更归档。
