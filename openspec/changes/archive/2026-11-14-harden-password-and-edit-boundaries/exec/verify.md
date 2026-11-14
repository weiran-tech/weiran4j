---
title: "认证与编辑边界验收"
status: "passed"
updated_at: "2026-11-14"
---
# Verify

# 一、集成记录(L6)

单工作区，无并行集成。10 个执行单元由同一执行者串行完成，无子代理或 worktree 合并。

## 输入检查
- [x] E1～E10 收尾笔记齐全
- [x] Layer 0 契约完成，未改变已批准的设计意图
- [x] 自测和最终硬闸门通过

## 重复实现消除
共用 useEditConflict / EditConflictFeedback，管理用户、行内字段、角色、菜单与本人资料不各自实现冲突状态机。登录、锁屏与 docs 共用 AuthAttemptFeedback；既有关闭保护继续复用。

## 被牺牲的方案
| 放弃的方案 | 来自 | 放弃理由 |
|---|---|---|
| 本机计数或淘汰活跃桶 | E3 | 重启/多实例绕过、硬容量失真 |
| 新增 Redis | E3 | 超出已批准的现有 MySQL 范围 |
| BCrypt 后只累计失败 | E3 | 无法限制并发在途比较，采用已批准的成功/失败均预占 |
| 新缓存版本配旧草稿再提交 | E6 | 静默重放旧输入会覆盖他人保存 |
| 仅修 design 模板 | E8 | schema/config 仍会注入旧事实 |

## 越界修改汇总
| 文件 | 申报单元 | 性质 | 处置 |
|---|---|---|---|
| infrastructure/build.gradle.kts | E3 | 必要连带：统一认证错误码的模块 api 依赖 | 保留，无第三方依赖 |
| IntegrationTestSupport / CookieAuthIT | E5 | 必要连带：既有请求显式适配版本；缺版本测试走原始调用 | 保留 |
| docs 主题基础样式与暗色同步 | E7 | 必要连带：新增演示在深色模式需可读 | 保留，卸载恢复原 body 属性 |
| project.md DS-2 | E9 | 必要连带：纠正 HTTP 契约权威文档指针 | 保留规则 ID/含义 |

# 二、规格一致性(L8)

## 前置条件:L7 硬闸门

基线 e10c7ac，加上会话开始已存在的工作区改动。没有 stash 或以缺少其他既存文件的状态伪造基线；所有命令均在最终代码快照执行，逐项退出码为 0。

| 检查(commands 的键) | 命令 | 结果 | 证据 |
|---|---|---|---|
| build | `(cd packages/server && JAVA_HOME=${JAVA_HOME_21:-$(/usr/libexec/java_home -v 21)} ./gradlew assemble --no-daemon) && pnpm --filter @weiran/manage build` | ☑ 绿 | `evidence/build.log` |
| test | `(cd packages/server && JAVA_HOME=${JAVA_HOME_21:-$(/usr/libexec/java_home -v 21)} ./gradlew test --no-daemon) && pnpm --filter @weiran/manage test` | ☑ 绿 | `evidence/test.log` |
| lint | `(cd packages/server && JAVA_HOME=${JAVA_HOME_21:-$(/usr/libexec/java_home -v 21)} ./gradlew check --no-daemon) && pnpm --filter @weiran/manage lint` | ☑ 绿 | `evidence/lint.log` |

补充：先 JDK 21 spotlessApply；docs 构建通过（docs-build.log），Node 提示词测试 3/3 通过（workflow-tests.log）；前端 53 文件、434 测试通过。后端各模块 JUnit 报告合计 312 个用例，失败/错误为 0，Testcontainers 真实 MySQL 的新增边界测试已执行。编译、覆盖率、SpotBugs、Checkstyle、Forbidden APIs、Error Prone/NullAway 均经 check；第三方构建提示未作为错误，未豁免门禁。

## tasks.md 逐条核对
| tasks.md 条目 | 执行单元 | 实现位置 | 一致 |
|---|---|---|---|
| 1.1 | E1 | CommonErrors / SystemAuthErrors | ☑ |
| 2.1 | E2 | system-api/domain 版本与 PasswordAttempts | ☑ |
| 3.1 | E3 | JdbcPasswordAttempts、配置、追加迁移与 PasswordAttemptsIT | ☑ |
| 3.2 | E4 | User/Role application 与 Mybatis repositories、EditBoundaryIT | ☑ |
| 4.1 | E5 | Controllers/request DTO、认证共用入口、EditVersionSchemaTest | ☑ |
| 5.1 | E6 | manage hooks/types/表单/反馈、EditConflict.test、LockScreen.test | ☑ |
| 5.2 | E7 | docs/page-states 与本地演示、浏览器证据 | ☑ |
| 6.1 | E8 | config/schema/当前 templates | ☑ |
| 6.2 | E9 | workflow-contracts.mjs、Node/真实 CLI 验证、机制文档 | ☑ |
| 7.1 | E10 | 配置/部署、现状契约与状态债务 | ☑ |

### 未实现条目
无。本地完成发布准备；生产维护窗口、统一配置和前后端同步发布由部署负责人执行，未声称已上线。

## design.md 一致性
| design 章节 | 设计要求 | 实现情况 | 一致 |
|---|---|---|---|
| DS-1/2 | 共享错误、必填 version、纯 Java 端口、OpenAPI | 100007/409、110108/429、100006/503，5 类更新 DTO required version | ☑ |
| DS-3 | 只追加迁移、计数硬容量与版本独立 | 两份新 Flyway；2 张内部表；user/role.edit_version | ☑ |
| DS-4/5 | 原权限、分层、同事务及模块装配 | 权限不变，认证准入独立提交，关系/吊销随编辑事务 | ☑ |
| DS-6 | 草稿与版本冻结、失败保留/确认重载 | 5 类入口覆盖；个人资料重载以版本 key 重建表单初值 | ☑ |
| Observability | 脱敏且有限告警、失败不放行 | outcome 聚合警告，摘要不进日志；存储/锁超时 fail-closed | ☑ |
| Workflow | 三处注入事实+有限守卫 | 实际 CLI 临时 change 正常/错误注入都已验证 | ☑ |
| Rollout/Rollback | 同步发布，无无条件写兼容 | 部署说明及现状契约已写，不回滚已发布迁移或重置吊销版本 | ☑ |

## specs 验收标准核对
| spec / Scenario | 验收标准 | 验证方式 | 通过 |
|---|---|---|---|
| admin-foundation FR-021 / 密码入口共享额度 | 原子预占、已知未知统一、成功占额及锁屏429 | PasswordAttemptsIT、AuthApplicationServiceTest、原认证回归 | ☑ |
| FR-021 / 共享计数故障与容量保护 | 重建不重置、容量/故障拒绝、不淘汰活跃桶 | 双适配器、硬容量、坏数据源、行锁超时及恢复测试 | ☑ |
| FR-021 / 前端认证限流恢复 | 会话保留、无自动重发、主动重试 | LockScreen 429 测试及 docs Chrome 模拟 | ☑ |
| FR-022 / 旧版本并发保存 | 一次成功，其余409，副作用回滚、缺版本400 | EditBoundaryIT 的真实 HTTP/数据库断言 | ☑ |
| FR-022 / 本人资料与管理编辑交错 | 重叠写入推进、独立字段不误用版本 | EditBoundaryIT 与既有密码/偏好/收藏/登录定向写回归 | ☑ |
| FR-022 / 后台刷新与冲突草稿恢复 | 旧草稿版本固定、确认失败/成功恢复 | 5 类编辑组件回归；菜单/本人缓存刷新；资料重载后直接关闭 | ☑ |
| FR-018 / 文档站切换并恢复页面状态 | 既有页面状态可操作 | 既有 QueryReadiness/权限/恢复组件回归、docs 构建，原场景保留 | ☑ |
| FR-018 / 编辑与查询恢复演示 | 正常、空、失败、重试与关闭保护 | 既有列表/日志/关闭保护回归与 docs 构建 | ☑ |
| FR-018 / 认证限流与编辑冲突演示 | 新状态本地可交互、重载失败保留 | Chrome 操作确认/取消/失败/成功、限流恢复，390px 深色截图，0业务请求/0页面异常 | ☑ |
| workflow-contracts FR-001 / 实际指令输出一致 | 全 artifact 实际组合输出采用当前事实 | 9 类 CLI instructions 输出及来源检查 | ☑ |
| workflow-contracts FR-002 / 废止断言回归与历史说明 | 各源错误失败，历史/禁止说明允许 | Node 正反夹具及真实 CLI 注入错误断言 | ☑ |

## 越界检查
已对照 git status / diff --stat、plan 文件所有权及 E1～E10 笔记。所有新增实施文件均属上述范围，必要连带已申报，无未申报越界。会话前既存的 docs/.vitepress/config.mts、sys_task 状态、批处理兼容迁移等单独保留；部署与 artifact/designREADME 上只叠加本 change 的相关段落，不能将整个既存 diff 计为本次完成。

## 不一致项归属判定
| # | 不一致内容 | 判定 | 去向 |
|---|---|---|---|
| 1 | 旧 Cookie 测试请求缺 version | 测试需适配新批准协议；新增缺版本测试仍要求400 | 已修测试并重跑 |
| 2 | 个人资料重载只更新值，没有重置初始基准 | 代码错 | 已按 version 重建表单并补关闭保护断言；最终三命令已重跑 |
| 3 | docs 缺 Semi 基础变量，深色模式不可读 | 代码错 | 已补导出 base.css 和暗色同步，真浏览器复验 |

## 遗留问题
- 请求幂等平台及其他资源版本协议仍属 artifact.md#13（部分解决），短信/MFA/绑定状态仍属 artifact.md#25；本次不声称关闭。
- 密码计数 guard 串行设计仅验证正确性，未做吞吐压测；已在设计和新增表的现状说明明确，不宣称任意规模性能。
- 本次未部署生产；旧标签和旧前端缺版本需刷新/同步发布，不能回退为无条件覆盖。

## 流程反馈
已修实际 config/schema/templates 和 DS-2 文档权威指针，保留历史归档及全部规则 ID；真实 CLI 测试使用临时原生 change，归档后仍能运行。

## 结论
- [x] 集成完成，越界汇总已写
- [x] L7 三项全绿
- [x] tasks.md 全部覆盖
- [x] design/specs 一致
- [x] 无未申报越界
- [x] 不一致项已归属并修复

**判定**:☑ 通过，进入 L9 人类审阅 diff

## L9 审阅记录

用户于 2026-11-14 明确回复“归档”，批准本次最终差异归档。仅执行规格合入和归档，未授权 commit/push；既存无关改动保留。
