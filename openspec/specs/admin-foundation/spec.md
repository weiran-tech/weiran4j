---
status: "active"
---

# admin-foundation Specification

## Purpose
本能力长期承担后台管理框架的底座职责：JWT 登录与令牌吊销、基于角色-菜单的权限模型（菜单驱动前端动态路由与按钮权限）、部门树、数据字典、系统配置，以及登录日志与操作日志两类审计。接口与字段的逐项定义见 `docs/01-架构与接口契约.md`（D-008 框架重写时建立），本 spec 只约束跨接口恒成立的行为。

## Requirements

### Requirement: [FR-001] 统一响应包络

所有 `/api/**` 接口 **MUST** 以 `{code, message, data}` 返回，成功时 `code` 为数字 `0`，失败时为五位数字错误码且前三位等于 HTTP 状态码。

#### Scenario: 成功响应的业务码是数字 0
- **WHEN** 已登录用户调用 `GET /api/auth/me`
- **THEN** 响应体 `code` 为数字 `0`，`data.username` 为当前用户名
- **判据**:集成测试断言 `$.code` 的 JSON 类型为 number 且值为 0

#### Scenario: 参数校验失败
- **WHEN** 调用 `POST /api/auth/login` 且 `username` 为空
- **THEN** 返回 HTTP 400，`code` 为 `40000`
- **判据**:响应状态 400 且 `$.code == 40000`

### Requirement: [FR-002] 登录与账号枚举防护

登录接口 **MUST** 对「用户名不存在」与「密码错误」返回同一错误码 `40101` 与同一 message，且无论成败都写入 `sys_login_log`。

#### Scenario: 用户名不存在与密码错误不可区分
- **WHEN** 分别用不存在的用户名、存在的用户名 + 错误密码调用登录
- **THEN** 两次均返回 HTTP 401、`code` 为 `40101`、message 相同
- **判据**:集成测试比对两次响应的 `code` 与 `message` 完全相等

#### Scenario: 内置管理员可登录
- **WHEN** 在全新库上以 `admin` / `admin123` 调用登录
- **THEN** 返回 `accessToken`，随后 `/api/auth/me` 的 `permissions` 为 `["*"]`
- **判据**:集成测试依次断言登录 `code == 0` 与 `$.data.permissions[0] == "*"`

### Requirement: [FR-003] 令牌吊销

修改密码、管理员重置密码、禁用账号 **MUST** 使该用户此前签发的全部令牌立即失效（`token_version` 递增）。

#### Scenario: 改密后旧令牌失效
- **WHEN** 用户调用 `PUT /api/auth/password` 成功后，再用旧令牌调用 `GET /api/auth/me`
- **THEN** 返回 HTTP 401、`code` 为 `40100`
- **判据**:集成测试断言旧令牌请求 `$.code == 40100`

### Requirement: [FR-004] 接口权限校验

标注 `@RequiresPermission` 的接口 **MUST** 拒绝未持有对应权限码的已登录用户（HTTP 403、`code` 为 `40300`），未登录请求 **MUST** 返回 HTTP 401；持有 `super_admin` 角色者放行一切。

#### Scenario: 无权限用户访问用户列表
- **WHEN** 一个未绑定任何角色的用户调用 `GET /api/users`
- **THEN** 返回 HTTP 403、`code` 为 `40300`
- **判据**:集成测试断言 `$.code == 40300`

#### Scenario: 未登录访问受保护接口
- **WHEN** 不带 `Authorization` 头调用 `GET /api/auth/me`
- **THEN** 返回 HTTP 401、`code` 为 `40100`
- **判据**:响应状态 401 且 `$.code == 40100`

### Requirement: [FR-005] 菜单驱动路由

`GET /api/auth/menus` **MUST** 返回当前用户可访问的 directory/menu 类型启用菜单树；前端 **MUST** 仅为其中 `type=menu` 且组件文件存在的节点注册路由，组件缺失时渲染占位而不崩溃。

#### Scenario: 种子菜单的组件全部存在
- **WHEN** 读取种子迁移中全部 `type=menu` 菜单的 `component`
- **THEN** 每一个都能在 `web/src/pages` 下解析到页面文件
- **判据**:`web` 的 page-registry 单测对全部种子 component 断言可解析

### Requirement: [FR-006] 树结构防环

菜单与部门的更新 **MUST** 拒绝把节点的 `parentId` 设为自身或其后代（HTTP 409、`code` 为 `40901`）；删除有子节点的菜单/部门 **MUST** 被拒绝。

#### Scenario: 部门挂到自己的后代下
- **WHEN** 把部门 A 的 `parentId` 更新为 A 的子部门 B
- **THEN** 返回 `code` 为 `40901`，A 的父节点不变
- **判据**:集成测试断言 `$.code == 40901` 且随后查询 A 的 `parentId` 未变

### Requirement: [FR-007] 内置数据保护

内置用户、角色、字典、配置（`is_builtin`）**MUST NOT** 被删除；内置管理员 **MUST** 始终保留 `super_admin` 角色。

#### Scenario: 删除内置角色被拒绝
- **WHEN** 调用 `DELETE /api/roles/{super_admin 的 id}`
- **THEN** 返回 `code` 为 `40901`，角色仍存在
- **判据**:集成测试断言 `$.code == 40901` 且随后 `GET /api/roles/{id}` 的 `code == 0`

### Requirement: [FR-008] 操作审计

标注 `@OperationLog` 的写接口 **MUST** 在 `sys_operation_log` 留下记录（含用户、路径、耗时、成功与否），请求体中的密码与令牌字段 **MUST** 以 `******` 代替；日志落库失败 **MUST NOT** 影响业务响应。

#### Scenario: 新增用户后可查到脱敏的操作日志
- **WHEN** 管理员调用 `POST /api/users`（请求体含 `password`）
- **THEN** 稍后 `GET /api/operation-logs` 可查到该记录，其 `requestBody` 不含明文密码
- **判据**:集成测试轮询等待记录出现，并断言 `requestBody` 包含 `******` 且不含明文密码
