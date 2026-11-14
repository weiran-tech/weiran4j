---
title: "菜单并发、授权校准及 OpenAPI 契约验收"
status: "passed"
updated_at: "2026-11-14"
---
# Verify

# 一、集成记录(L6)

单工作区，无并行集成。9 个执行单元由同一 agent 顺序完成；已读完 E1~E9 收尾笔记。

## 输入检查
- [x] notes 齐全
- [x] Layer 0 已完成且冻结契约未改变
- [x] 自测及全量门禁通过

## 重复实现消除
- 成功响应包装适用性由 ApiResponsePolicy 统一，运行时与 OpenAPI 共用，未逐接口复制 schema。
- me/menus 合为一个快照 query，角色和菜单 mutation 成功时只失效一次统一 key。
- 菜单冲突复用 useEditConflict/EditConflictFeedback，不再增加一套交互状态机；授权恢复反馈与校准生命周期由业务和 docs 共用。

## 被牺牲的方案
| 放弃的方案 | 原因 |
|---|---|
| 只给菜单加单行版本 | 不同节点互挂仍可形成环，需要结构守卫 |
| 仅 synchronized 或本机缓存失效 | 多实例不共享边界 |
| Redis 广播 | 额外运行依赖，现有 MySQL 足以承担低频授权写与全局 revision |
| 分开更新用户和菜单 | 可能出现导航与按钮属于不同版本 |
| 403 自动重放写请求 | 可能产生重复业务副作用；只校准并保留失败 |
| 全量替换 TS 客户端 | 超出本轮自动响应 schema 的范围 |

## 越界修改汇总
| 文件/范围 | 申报单元 | 性质 | 处置 |
|---|---|---|---|
| BOM common 约束 | E1 | 必要连带 | 保留，与 UI starter 共用同一版本常量，非版本升级 |
| MenuAssembler / DO / TS 和 fixture | E2/E6 | 必要连带 | 保留，消费新增菜单版本 |
| IntegrationTestSupport / EditVersionSchemaTest | E5 | 必要连带 | 保留，既有测试请求补版本，缺字段专项仍绕过工厂 |
| 既有 auth me/menus fixture 与断言 | E7 | 必要连带 | 保留，测试原子快照实际请求 |
| request 的旧会话 401 保护 | E7 | 必要连带 | 保留，旧校准结果不得清理新会话 |
| 组件登记、表状态索引、架构与部署说明 | E9 | 必要连带 | 保留，使文档与实现一致 |

# 二、规格一致性(L8)

## 前置条件:L7 硬闸门

| 检查 | 命令 | 结果 | 证据 |
|---|---|---|---|
| build | `(cd packages/server && JAVA_HOME=${JAVA_HOME_21:-$(/usr/libexec/java_home -v 21)} ./gradlew assemble --no-daemon) && pnpm --filter @weiran/manage build` | ☑ 绿，exit 0 | `evidence/build.log` |
| test | `(cd packages/server && JAVA_HOME=${JAVA_HOME_21:-$(/usr/libexec/java_home -v 21)} ./gradlew test --no-daemon) && pnpm --filter @weiran/manage test` | ☑ 绿，exit 0 | `evidence/test.log` |
| lint | `(cd packages/server && JAVA_HOME=${JAVA_HOME_21:-$(/usr/libexec/java_home -v 21)} ./gradlew check --no-daemon) && pnpm --filter @weiran/manage lint` | ☑ 绿，exit 0 | `evidence/lint.log` |

格式先行使用 JDK 21，format.log 保存真实输出；Java 322 测试，0 失败/错误/跳过；前端 55 文件、442 测试通过。docs 构建另见 docs-build.log。

最终 L7 全绿，无存量红灯或条件性放行。迭代时发现的媒体类型推断、测试引用/防抖时序、空安全及格式问题均已修正后重跑，不采用早期失败日志充当证据。

## tasks.md 逐条核对
| 条目 | 单元 | 实现位置 | 一致 |
|---|---|---|---|
| 1.1 | E1 | ApiResponsePolicy / WeiranOpenApiAutoConfiguration、OpenApiResponseIT、OptionalOpenApiTest | ☑ |
| 2.1 | E2 | MenuStructureGuard / AuthorizationRevision / MenuNode / AuthorizationSnapshotView / TS | ☑ |
| 3.1 | E3 | MenuApplicationService、MybatisMenuRepository、JdbcMenuStructureGuard、Flyway、MenuBoundaryIT | ☑ |
| 3.2 | E4 | JdbcAuthorizationRevision、AuthSnapshotCache、LocalRbacPermissionSource、AuthorizationRevisionIT | ☑ |
| 4.1 | E5 | AuthController、MenuController、UpdateMenuRequest、EditVersionSchemaTest | ☑ |
| 5.1 | E6 | MenuFormModal、MenuConflict.test.tsx | ☑ |
| 5.2 | E7 | useAuthorizationCalibration、auth queries、request、App/AdminLayout、authorization-calibration.test.tsx | ☑ |
| 5.3 | E8 | docs AuthorizationCalibrationDemo / EditBoundaryDemos / PageStateDemoReact | ☑ |
| 6.1 | E9 | 状态、部署、架构、组件清单及本次真实 evidence | ☑ |

### 未实现条目
无。9/9 完成。

## design.md 一致性
| 章节 | 实现情况 | 一致 |
|---|---|---|
| DS-1 共享契约 | 纯 Java 端口、独立版本和 revision、原子快照及可选文档适配 | ☑ |
| DS-2 API | 新快照 GET，菜单编辑必填 version；原路径和旧快照接口兼容 | ☑ |
| DS-3 数据库 | 一个追加迁移、两个守卫表、菜单版本；旧迁移未改 | ☑ |
| DS-4 权限 | 原有权限/操作日志保留，快照只要求有效用户，未增加无关权限码 | ☑ |
| DS-5 分层 | SQL 在 infrastructure，端口在 domain，应用事务装配；app 仅测试 | ☑ |
| DS-6 前端 | 统一 query、可见在线校准、持续恢复、冻结菜单草稿及 docs 本地演示 | ☑ |
| 可观测与发布 | 请求号/失败反馈、维护窗口同步切换、保留迁移与新列回退说明 | ☑ |

## specs 验收标准核对
| AC | spec / 场景 | 验证方式 | 通过 |
|---|---|---|---|
| AC-1 | FR-006 防环、跨事务互挂与父删子增 | MenuBoundaryIT：独立 HTTP 事务、类型变化竞争和跨连接锁等待 | ☑ |
| AC-2 | FR-022 菜单草稿版本及冲突恢复 | 缺版本 HTTP 400、同版 CAS 409、版本单次推进；MenuConflict 测试取消/失败/成功重载 | ☑ |
| AC-3 | FR-003/023 跨实例修订号 | AuthorizationRevisionIT：两个独立缓存，共享 MySQL，用户角色/角色状态/菜单状态/角色授权、回滚和交错快照；缺行及溢出拒绝 | ☑ |
| AC-4 | FR-005/023 原子快照与校准 | 身份/菜单单请求，假时钟 30 秒及可见/在线事件，去重和旧会话结果隔离；浏览器等待真实周期 | ☑ |
| AC-5 | FR-023 403 不重放、失败恢复 | 100102 合并和冷却、不递归、不重放；100103 排除、401 保留原行为、15秒信号；失败保留快照和手动恢复 | ☑ |
| AC-6 | FR-001 自动响应 schema | 真 Springdoc 与 HTTP 比对对象、列表、分页、String、Void/显式包络、组合 Skip 及错误请求号；无文档类路径启动 | ☑ |
| AC-7 | FR-018 文档状态演示及全量验证 | docs 构建，真实浏览器桌面/390px 深色，无横向溢出；菜单冲突及授权加载/空/失败/重试/禁用/变化；0业务请求0异常 | ☑ |

## 越界检查
对照 git diff 与未跟踪文件：framework/BOM 归 E1；system 端口、API、菜单和 auth 实现及测试归 E2~E5；manage 交互和 fixture 归 E6/E7；docs 归 E8；openspec change、state 与契约部署文档归 E9。无 weiran-region、短信/MFA、历史迁移或归档目录的改动，未发现未申报越界。

## 不一致项归属判定
- 无未处置设计分歧，未通过修改 spec 迁就未实现行为。
- 真实文档测试发现默认媒体类型需要归一到实际 JSON：属实现问题，已修复且包含完整重跑。
- 菜单重载测试须遵守 Semi Modal 确定按钮 100ms leading 防抖，已按真实控件语义等待；未通过修改业务功能绕过测试。
- 旧会话 401 清新会话为校准边界中的实现缺口，已修复并验证旧成功/过期两种响应。

## 遗留问题
- 本轮四条关闭目标已移到 sys_menu.md#06 与 artifact.md#02/#04/#26 的 changelog。
- 仍保留 artifact.md#25 短信/MFA 单进程状态、#13 请求幂等及其它资源并发范围、#14 日志包含查询；均为原已登记且本轮明确不做的项。
- 全局守卫适合后台低频管理写入，未进行大规模吞吐压测；部署必须同步切换，直接 SQL 改授权需维护 revision。

## 流程反馈
- 单 checkout 串行执行，未创建 worktree 或子代理；无分层冲突。
- 自动包装需覆盖默认 */* 媒体类型；已用真实文档/HTTP 固定行为。没有变更流水线本体。

## 结论
- [x] 集成完成，必要连带已汇总
- [x] L7 三项全绿
- [x] tasks 条目全部覆盖
- [x] design/specs 一致
- [x] 无未申报越界
- [x] 不一致项已处置

**判定**：通过，进入 L9 人类审阅 diff。

## L9 状态
2026-11-14，用户明确回复「批准」，批准当前最终差异并归档。进入 L10，使用原生 CLI 归档；本次未请求提交或推送。
