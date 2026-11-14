---
title: "三项边界改进现状调研"
status: "draft"
updated_at: "2026-11-14"
---

# Explore

## 调研范围

按目录结构 → rg 符号索引 → 定点精读 → 最后反查调用的顺序执行。源码精读收敛在认证服务/MFA/认证 Controller、用户应用与仓储、角色应用与仓储及三份编辑组件共 10 个文件；DTO、端口、hook、测试只检索声明/调用索引。工作流与规则文档另行读取。没有展开无关模块。

## 现有实现

Java 位置以 packages/server 为前缀，... 为 com/wulicode/weiran 对应包。

| 能力 | 位置 | 现状 |
|---|---|---|
| 密码验证 | weiran-system/weiran-system-application/src/main/java/.../system/application/auth/AuthApplicationService.java:205 | 直接查询并 BCrypt；未知账号 dummy BCrypt；verifyPassword:330 无节流 |
| MFA 密码入口 | 同模块 .../auth/MfaLoginApplicationService.java:79 | 先 authenticatePasswordLogin，再创建 MFA 挑战；不能用 MFA 次数限制代替密码阶段节流 |
| 锁屏入口 | system-adapter/.../web/AuthController.java:275 | 传当前用户和密码，没有 IP 参数；可按可信用户 id 限流 |
| 用户编辑 | system-application/.../user/UserApplicationService.java:147 | 同事务更新账号、必要时吊销令牌、全量替换角色；没有客户端版本前提 |
| 定向写入 | system-infrastructure/.../persistence/MybatisUserRepository.java:116、137 | 自己资料和管理员编辑存在 nickname/gender 重叠；登录/密码/偏好使用独立字段更新 |
| 角色编辑与授权 | system-application/.../role/RoleApplicationService.java:93、119 | 普通编辑与分配菜单无版本协议；关联先删后插 |
| 用户/角色弹窗 | packages/manage/src/pages/system/users/UserFormModal.tsx:47、roles/RoleFormModal.tsx:31 | 草稿来自传入记录，复用关闭保护，保存未提交版本 |
| 授权侧滑 | packages/manage/src/pages/system/roles/RoleMenuSheet.tsx:40 | 详情在 Query 缓存，草稿只保存 checked；保存时不能把新详情版本自动嫁接到旧 checked |
| 模板 | openspec/schemas/devops-workflow/templates/design.md:101、explore.md:104 | 仍声称 wuli3/字符串 0/无 Flyway |
| 实际注入 | openspec/schemas/devops-workflow/schema.yaml:260 | apply 等 instruction 仍含 Drizzle、@zenith/shared 与 worktree merge 命令 |

## 可复用点

| 对象 | 复用方式 | 改造 |
|---|---|---|
| ClientIpResolver / ClientContext | 密码 IP 维度使用已修复的可信、规范化来源 | 不重新解析头 |
| MySQL / Spring 事务 / 模块自动配置 | 密码尝试计数的共享原子持久化 | 新增 domain 端口及 infrastructure 实现 |
| User/Role 仓储定向写 | 在业务负责的列更新上加 CAS | 保留密码与 token_version 的独立原子路径 |
| useFormCloseGuard / QueryReadiness / ListFeedback | 冲突时保留草稿、重载失败、保存期保护 | 增加共用冲突状态逻辑及 docs 演示 |
| docs/page-states.md 的本地 React 演示 | 展示限流和版本冲突 | 不依赖真实服务 |
| project.md CP/SL/WT/CC/PK/TG/DS | 模板事实来源 | 校正文案，不改规则含义 |

## 真实约束

- token_version 专用于吊销，不能用于编辑版本。登录/偏好频繁写入也不应让编辑草稿失效。
- 用户自己资料与管理员编辑重叠，必须同步保护；其他重叠原子补丁至少推进版本。
- 成功登录会写最后登录信息；节流计数不能被外层认证失败事务回滚，BCrypt 不得占用计数事务锁。
- 引入 required version 是写协议变化，不能用默认值或服务端最新值兼容绕过；新增请求保持不需版本。
- 已有 MySQL，未配置 Redis。认证错误号 110101～110107 已用，110108 可用于尝试过频；跨资源编辑冲突属于框架 CommonErrors（100007 待登记/实现）。
- 单工作区 main 与 origin/main=e10c7ac 一致，无第二活跃 change。开工前稳定改动为 Mermaid 配置、设计欠账、artifact #26/#27、sys_task 与批处理兼容迁移/部署说明；保留，不混入本次实现。

## 影响面

### 普通改动

system 五层的用户/角色/认证契约、实现和定向测试；framework 通用冲突错误；app 测试/配置；前端用户/角色/个人资料/锁屏和登录反馈、hooks/types/mock；docs；现行 OpenSpec 注入输入与专项守卫。

### 共享层命中

#### 桶文件 / 注册表

| ID | 文件 | 是否命中 · 原因 |
|---|---|---|
| SL-1 | settings.gradle.kts | 未命中，不新增模块 |
| SL-2 | BOM | 未命中，不加依赖 |
| SL-3 | app/build.gradle.kts | 未命中，复用已有测试设施 |
| SL-4 | 菜单 Flyway | 菜单未命中；system 结构迁移命中序号资源，串行创建 |
| SL-5 | pages / page-registry | 修改已有页面，无新增菜单/注册项 |

#### 跨模块契约

| ID | 文件 | 是否命中 · 原因 |
|---|---|---|
| SL-6 | framework/error/CommonErrors | 命中：跨用户/角色的 EDIT_CONFLICT 100007，Layer 0 |
| SL-7 | framework/page、response | 未命中，包络及分页不变 |
| 补充 | system-api DTO/命令、domain 仓储端口、TS api.ts | 命中：version 与节流契约，串行冻结 |

#### 序号型资源与构建约定

- system 新迁移版本号预留 V202611141900（认证节流表与内部准入锁表）、V202611141901（user/role 编辑版本）；实现前重查唯一性，已合入脚本永不改。
- build-logic、BOM：未命中。
- schema/templates/config、project.json 的新守卫登记及 guard：命中全局流水线，串行 Layer 0，不并行代理。

不会碰：region 业务、媒体/批处理实现、历史迁移与归档正文、短信/MFA 挑战存储、其他会话授权刷新、审计传递机制、原有 Mermaid 配置。

## 对 interview 的反向修正

个人资料与管理员编辑存在重叠字段，已在 interview 纳入保护范围；协议升级、MySQL 持久化取舍均明确待 L3 审阅，无未决输入。

## 风险预警

| 风险 | 应对 |
|---|---|
| 串行 MySQL 计数增加认证开销 | 事务只预占计数，不执行 BCrypt；设置容量与锁等待失败关闭，不静默放行 |
| 前后端分批发布导致旧请求缺版本 | 同步发布，旧写请求明确 400，刷新页面后再编辑 |
| 缓存刷新把旧草稿配上新版本 | 基准快照和 version 一起冻结，只在确认重载后更换 |
| 守卫误扫历史注释 | 仅当前注入源、具体失效断言，包含允许历史说明的测试 |

## Gate

- [x] 共享层已逐项列出
- [x] interview 已涵盖实际重叠写入
- [x] 复用点确认
