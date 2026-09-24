---
status: "active"
---

# rbac-role-management Specification

## Purpose
角色是账号与权限之间的中间层：一个角色绑定一组权限点，账号通过持有角色获得这些权限。本能力长期负责角色本身的生命周期管理（定义、启禁用、系统内置角色保护）以及角色与权限点之间绑定关系的维护，是后台管理员配置"谁能做什么"的入口。系统内置角色（`system=true`）的存在是为了保护被代码硬编码引用的角色标识不被业务侧误删或改名。

## Requirements

### Requirement: [FR-001] 角色分页列表查询

管理端 **MUST** 能够分页查询角色列表，支持按账号类型（`user`/`backend`）与启用状态筛选。

#### Scenario: 按账号类型筛选角色列表
- **WHEN** 调用角色列表接口并传入 `accountType=backend`
- **THEN** 返回结果中的每一条角色记录的 `accountType` 字段均为 `backend`
- **判据**:接口返回的 `PageResult.items()` 非空时，逐项断言 `accountType == "backend"`；接口 HTTP 状态码为 200，响应体 `code` 字段为字符串 `"0"`

#### Scenario: 分页参数超出上界被拒绝
- **WHEN** 调用角色列表接口并传入 `size=201`（超过 `PageQuery.MAX_SIZE`）
- **THEN** 请求被拒绝，不返回数据
- **判据**:接口返回 HTTP 400，响应体 `code` 字段不等于 `"0"`

### Requirement: [FR-002] 角色新增与编辑

管理端 **MUST** 能够新增角色（提供 `name`/`title`/`description`/`accountType`）和编辑已有角色的可变字段。系统内置角色（`system=true`）的 `name` 字段 **MUST NOT** 被编辑接口修改。

#### Scenario: 新增角色成功后可被查询到
- **WHEN** 提交新增角色请求，`name=custom-editor`、`accountType=backend`
- **THEN** 角色被持久化，后续按 `name` 查询能取到该角色，`system` 字段为 `false`
- **判据**:新增接口返回 HTTP 200 且响应体 `data.id` 为正整数；紧接着调用详情接口用该 `id` 查询，返回的 `name` 字段等于 `custom-editor`

#### Scenario: 尝试修改系统内置角色的 name 被拒绝
- **WHEN** 对一个 `system=true` 的角色发起编辑请求，请求体中 `name` 字段与当前值不同
- **THEN** 请求被拒绝，角色的 `name` 字段保持不变
- **判据**:接口返回 HTTP 400 或对应的业务错误码（非 `"0"`）；随后查询该角色详情，`name` 字段与请求前一致

### Requirement: [FR-003] 角色删除

管理端 **MUST** 能够删除非系统内置角色；删除系统内置角色（`system=true`）的请求 **MUST** 被拒绝。

#### Scenario: 删除非系统角色成功
- **WHEN** 对一个 `system=false` 的角色发起删除请求
- **THEN** 该角色从列表查询结果中消失
- **判据**:删除接口返回 HTTP 200；随后调用列表接口，返回结果中不再包含该角色的 `id`

#### Scenario: 删除系统内置角色被拒绝
- **WHEN** 对一个 `system=true` 的角色发起删除请求
- **THEN** 删除操作被拒绝，角色仍然存在
- **判据**:接口返回非 `"0"` 的业务错误码；随后调用详情接口仍能查到该角色

### Requirement: [FR-004] 角色-权限绑定的整体替换语义

角色的权限分配保存操作 **MUST** 以"整体替换该角色当前持有的权限集合"语义执行，即同一次保存调用后，`pam_permission_role` 中该角色对应的记录集合精确等于本次提交的权限 ID 集合，不残留旧记录、不产生重复记录。

#### Scenario: 保存权限集合后旧的多余绑定被清除
- **WHEN** 角色当前绑定权限 `{P1, P2, P3}`，发起保存请求提交权限集合 `{P1, P4}`
- **THEN** 保存后该角色实际绑定的权限集合精确为 `{P1, P4}`，`P2`、`P3` 的绑定关系被移除
- **判据**:保存接口返回 HTTP 200 后，调用角色详情接口的权限字段，返回的权限 ID 集合与 `{P1, P4}` 完全相等（无多、无少）

#### Scenario: 同一权限集合重复保存不产生重复行
- **WHEN** 对同一角色，用相同的权限集合 `{P1, P4}`连续发起两次保存请求
- **THEN** 该角色在 `pam_permission_role` 中对应 `P1`、`P4` 各只有一条记录
- **判据**:两次保存均返回 HTTP 200；第二次保存后查询角色详情，权限集合仍精确为 `{P1, P4}`（数量为 2，非 4）

### Requirement: [FR-005] 角色权限点命名规范

新增权限点的 `name` 字段 **MUST** 符合 `weiran-system:{resource}.{action}` 格式（如 `weiran-system:role.manage`），不得使用 PHP 侧 `backend:{module}.{action}` 格式。

#### Scenario: 角色管理相关权限点命名符合规范
- **WHEN** 查询本 change 新增的角色管理相关权限点定义
- **THEN** 其 `name` 字段均以 `weiran-system:` 开头，不包含 `backend:` 前缀
- **判据**:对权限点定义做正则匹配 `^weiran-system:[a-z-]+\.[a-z]+$`，全部命中
