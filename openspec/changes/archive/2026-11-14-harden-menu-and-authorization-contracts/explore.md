---
title: "菜单、授权与响应契约现实校验"
status: "draft"
updated_at: "2026-11-14"
---

# Explore

## 调研范围

先按目录确认 framework / system 五层 / manage / docs；再以菜单保存、缓存失效、响应包装符号检索；定点精读复用本会话审查的实现，最后反查调用点。未扫描无关业务逻辑。

| 模块 | 目录/文件 | 为什么看它 |
|---|---|---|
| framework | web/ApiResponseBodyAdvice、ErrorResponse、autoconfigure | 包装规则和装配位置 |
| system | menu、auth、user、role | 树结构事务、缓存读写入口及授权快照 |
| web / docs | auth queries、request、MenuFormModal、PageStateDemo | 查询所有权与可复用交互 |

## 现有实现

以下 Java 路径均相对 packages/server，web 路径相对 packages/manage/src。

| 能力 | 位置 | 现状 |
|---|---|---|
| 菜单校验 | `weiran-system/weiran-system-application/src/main/java/com/wulicode/weiran/system/application/menu/MenuApplicationService.java:58` | 普通查询后更新，无共享结构边界 |
| 菜单写入 | `weiran-system/weiran-system-infrastructure/src/main/java/com/wulicode/weiran/system/infrastructure/persistence/MybatisMenuRepository.java:45` | updateById，不比较草稿版本 |
| 权限缓存 | `weiran-system/weiran-system-application/src/main/java/com/wulicode/weiran/system/application/auth/AuthSnapshotCache.java:24` | 30s 本地缓存、提交后本进程失效 |
| 权限读取 | `weiran-system/weiran-system-application/src/main/java/com/wulicode/weiran/system/application/auth/LocalRbacPermissionSource.java:36` | 按用户缓存，无跨实例修订号 |
| 当前身份与菜单 | `weiran-system/weiran-system-application/src/main/java/com/wulicode/weiran/system/application/auth/AuthApplicationService.java:249` | me / menus 为两个独立只读事务，可能来自不同提交视图 |
| 前端授权 | `hooks/queries/auth.ts:48`、`lib/query.ts:24` | 两个 Infinity 查询，默认关闭窗口聚焦刷新 |
| 请求错误 | `utils/request.ts:150` | 401 清会话；无授权变化通知；403 不重放 |
| 响应包装 | `weiran-framework/src/main/java/com/wulicode/weiran/framework/web/ApiResponseBodyAdvice.java:46` | 实际包装、跳过注解及已包络例外已集中 |
| 文档依赖 | `weiran-app/build.gradle.kts:39` | springdoc 当前只由应用引入，framework 不向 domain/api 暴露框架库 |

## 可复用点

| 可复用对象 | 位置 | 复用方式 | 需要改造吗 |
|---|---|---|---|
| Hierarchy | system-domain/hierarchy | 保留纯 Java 树规则 | 否，外围保证检查和写入原子性 |
| 编辑版本协议 | 用户/角色及 useEditConflict、EditConflictFeedback | 菜单沿用 100007 与草稿恢复交互 | 是，扩展菜单版本 |
| AuthSnapshotCache | system-application/auth | 保留有界缓存，以共享修订号标识结果 | 是 |
| ApiResponseBodyAdvice | framework/web | 抽取可复用的包装判定，运行时和 OpenAPI 共用 | 是 |
| PageStateDemo | docs/.vitepress/theme | 本地模拟服务与实际组件/hook 演示 | 是 |

## 真实约束

| 约束 | 证据位置 | 对设计的影响 |
|---|---|---|
| MySQL Repeatable Read | application 的事务边界 | 必须先取结构锁再建立校验快照；授权版本与数据同一只读事务视图 |
| 令牌状态每次查库 | LocalIdentityResolver / CP-8 | 新修订号不能替代 token_version |
| PermissionSource SPI | LocalRbacPermissionSource / DispatchingTokenAuthenticator | 修订号约束本地 RBAC，不干涉外部自定义来源 |
| 部分 API 已声明 ApiResponse | AuthController、ErrorResponse | OpenAPI 不能二次包装；错误 schema 单独定义 |
| docs 本地演示 | AGENTS.md | 权限刷新演示不能依赖真实账号或后台 |

## 影响面

### 普通改动

| 文件/模块 | 动作 |
|---|---|
| system 五层 | 新结构守卫、修订号端口、菜单版本、授权快照接口 |
| manage | 单一授权查询、403 通知与刷新恢复、菜单冲突 |
| docs / state / 架构与部署文档 | 演示新交互、更新事实及发布约束 |
| framework / app | 自动 schema 定制及真实文档集成验证 |

### 共享层命中 ⚠️

#### 桶文件 / 注册表(必然冲突)

| ID | 文件 | 冲突原因 | 是否命中 · 预计改动 |
|---|---|---|---|
| SL-1 | settings.gradle.kts | 自动发现规则全仓共享 | 未命中，无新模块 |
| SL-2 | weiran-dependencies/build.gradle.kts | 依赖版本单点 | 未命中，复用 BOM 已管理 springdoc 版本 |
| SL-3 | weiran-app/build.gradle.kts | 装配及测试依赖 | 暂不修改依赖，文档集成测试采用已有 starter |
| SL-4 | Flyway / sys_menu | 全局版本号 | 命中：追加 V202611142100__system_menu_and_authorization_boundaries.sql，无新增菜单 ID |
| SL-5 | pages / page-registry | 菜单 component 配对 | 无新页面；改现有 MenuFormModal，不改页面注册表 |

#### 跨模块契约(多层共同消费)

| ID | 文件 | 冲突原因 | 是否命中 · 预计改动 |
|---|---|---|---|
| SL-6 | CommonErrors | 共享错误语义 | 未命中，复用 100007/100004/100006 |
| SL-7 | response/page + TS API | 共享响应描述 | 命中：保持运行时包络，自动 schema 描述与 TS 授权快照/菜单版本串行冻结 |

#### 序号型资源

| 资源 | 判定 | 分配 |
|---|---|---|
| Flyway | 命中，已检索仓内全部迁移，无同号 | system 下 V202611142100__system_menu_and_authorization_boundaries.sql |
| 菜单 ID / 权限码 | 未命中 | 不增加页面、权限或编号 |
| 自动配置 / 构建约定 | 命中 framework / system 既有装配；不改 build-logic | Layer 0 串行处理；springdoc 可选类路径，不向领域层传递 |

## 对 interview 的反向修正

| 原结论 | 现实情况 | 修正后 | 是否已同步回 interview.md |
|---|---|---|---|
| 同时替换身份和菜单 | me / menus 目前独立事务 | 新增快照接口，旧接口保留兼容 | ☑ 已在 AC-4 表达 |

## 不会碰的目录

- weiran-region、weiran-demo、业务独占配置与 AGENTS.biz.md。
- 历史 Flyway、已归档 change、openspec guards/schema/check 本体。
- 短信/MFA 的挑战实现、日志检索仓储。

## 风险预警

| 风险 | 触发条件 | 建议应对 |
|---|---|---|
| 锁后仍读到旧快照 | 先查菜单再取得锁 | 事务第一项持久化动作取共享结构锁 |
| 新版本配旧数据 | 版本和权限分开事务读 | 缓存加载以同一只读事务版本视图装载 |
| 403 刷新递归 | 快照查询也失败 | 去重、冷却并排除校准请求自身 |
| 新旧实例混跑 | 旧写入不推进版本 | 维护窗口切换，禁止用滚动发布宣称即时一致性 |

## Gate

- [x] 共享层命中已完整列出(漏一项 = L5 必然冲突)
- [x] 与 interview 的冲突项已回写 interview.md
- [x] 可复用点已确认,避免重复造轮子
