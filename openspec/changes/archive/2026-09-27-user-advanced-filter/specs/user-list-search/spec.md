## Purpose

本能力长期负责后台用户列表的检索口径:`GET /api/users` 接受哪些查询条件、每个条件如何匹配、多个条件如何组合、非法取值如何拒绝,
以及用户管理页的高级筛选面板与「已选条件」标签如何把这些条件交给接口并回显给管理员。

## ADDED Requirements

### Requirement: [FR-001] 单字段精确匹配

`GET /api/users` **MUST** 接受 `username`、`userId`、`phone`、`email` 四个独立查询参数,各自只与对应列做等值比较
(字符串参数先去首尾空白;去空白后为空视为未传)。
这四个参数 **MUST NOT** 做模糊匹配;既有 `keyword` 参数的口径(用户名 / 昵称 / 手机模糊)保持不变。

#### Scenario: 用户名精确匹配不命中前缀
- **WHEN** 库中有用户 `alice`,请求 `GET /api/users?username=ali`
- **THEN** 结果不包含 `alice`;请求 `username=alice` 时结果恰好是 `alice` 一人
- **判据**:集成测试断言两次请求的 `data.list[*].username` 分别为 `[]` 与 `["alice"]`

#### Scenario: 用户 ID 不存在返回空页
- **WHEN** 请求 `GET /api/users?userId=999999999`(不存在的 ID)
- **THEN** 返回成功,列表为空
- **判据**:响应 `code=0`、`data.total=0`、`data.list` 为空数组

#### Scenario: 手机号与邮箱精确匹配
- **WHEN** 用户 A 的手机号为 `13800000001`、邮箱为 `a@x.com`,请求 `phone=13800000001` 或 `email=a@x.com`,以及 `phone=1380000`
- **THEN** 前两次只返回 A,最后一次不返回 A
- **判据**:集成测试断言三次请求返回的用户 ID 集合

### Requirement: [FR-002] 角色过滤

`GET /api/users` **MUST** 接受 `roleId` 参数,只返回在用户-角色关联中拥有该角色的用户;一个用户无论拥有几个角色 **MUST** 只出现一次,
`total` **MUST** 等于去重后的用户数。

#### Scenario: 多角色用户不重复
- **WHEN** 用户 B 同时拥有角色 R1、R2,请求 `roleId=R1`
- **THEN** 结果中 B 出现且只出现一次;不拥有 R1 的用户不出现
- **判据**:集成测试断言 `data.list` 中 B 的 ID 计数为 1,且 `data.total` 等于 `data.list` 的去重 ID 数

### Requirement: [FR-003] 性别过滤

`GET /api/users` **MUST** 接受 `gender` 参数,取值只能是 `male`、`female`、`unknown`,只返回 `gender` 等于该值的用户;
未传或为空白时 **MUST NOT** 按性别过滤。非法取值 **MUST** 返回业务错误 `40000`。

#### Scenario: 按性别过滤
- **WHEN** 请求 `gender=female`
- **THEN** 结果中每个用户的 `gender` 都是 `female`
- **判据**:集成测试断言 `data.list[*].gender` 全部为 `female` 且至少一条

#### Scenario: 未传性别不改变结果
- **WHEN** 请求不带 `gender`
- **THEN** 结果与不支持性别过滤之前一致,包含 `gender=unknown` 以外的用户
- **判据**:`Gender.filterOf(null)` 与 `Gender.filterOf(" ")` 单测返回 `null`;集成测试断言无 `gender` 时结果含 `male` 用户

#### Scenario: 非法性别值
- **WHEN** 请求 `gender=x`
- **THEN** 返回业务错误
- **判据**:HTTP 400,响应 `code=40000`

### Requirement: [FR-004] 时间范围过滤

`GET /api/users` **MUST** 接受 `createdStartTime` / `createdEndTime`(对 `created_at`)与 `lastLoginStartTime` / `lastLoginEndTime`
(对 `last_login_at`),格式 `yyyy-MM-dd HH:mm:ss`,按闭区间过滤;只传一端时按单边过滤。
传了最后登录时间任一端时,从未登录(`last_login_at` 为空)的用户 **MUST NOT** 被返回。格式非法 **MUST** 返回 `40000`。

#### Scenario: 闭区间包含边界
- **WHEN** 用户 C 的 `created_at` 恰为 `T`,请求 `createdStartTime=T&createdEndTime=T`
- **THEN** 结果包含 C
- **判据**:集成测试断言结果 ID 集合含 C

#### Scenario: 单边与空值
- **WHEN** 只传 `lastLoginStartTime`(早于所有登录时间)
- **THEN** 只返回登录过的用户,从未登录的新建用户不在结果中
- **判据**:集成测试断言新建未登录用户的 ID 不在结果中,已登录的 `admin` 在结果中

#### Scenario: 时间格式非法
- **WHEN** 请求 `createdStartTime=2026-13-01`
- **THEN** 返回业务错误
- **判据**:HTTP 400,响应 `code=40000`

### Requirement: [FR-005] 条件组合与默认结果

`GET /api/users` 的全部查询条件(`keyword`、`status`、`departmentId` 与本能力新增的各参数)**MUST** 取交集;
未传任何新增参数时,结果 **MUST** 与仅支持 `keyword` / `status` / `departmentId` 时完全一致。

#### Scenario: 多条件取交集
- **WHEN** 同时传 `keyword` 与 `gender`、`roleId`
- **THEN** 结果中每个用户同时满足三个条件
- **判据**:集成测试断言结果为符合全部条件的那一个用户

#### Scenario: 不传新参数行为不变
- **WHEN** 请求 `GET /api/users?keyword=<name>&status=enabled&departmentId=1`
- **THEN** 结果与改造前相同
- **判据**:既有集成用例 `UserRoleIT.userCrud` 不改断言仍通过

### Requirement: [FR-006] 用户管理页高级筛选面板

用户管理页的高级筛选面板 **MUST** 默认收起;展开后 **MUST** 依次提供:用户名、用户 ID、手机号、邮箱、所属部门、角色、状态、性别、创建时间、最后登录时间。
点「搜索」**MUST** 把已填写的字段作为对应查询参数发出;时间字段按天选择,开始日 **MUST** 取当天 `00:00:00`、结束日 **MUST** 取当天 `23:59:59`。

#### Scenario: 面板默认收起且字段齐全
- **WHEN** 打开用户管理页,再点「高级筛选」
- **THEN** 打开前面板不存在;打开后字段标签按上述顺序出现
- **判据**:前端测试断言 `.search-field__label` 文本序列等于上述 10 项

#### Scenario: 搜索发出对应参数
- **WHEN** 在面板填写用户名、选择角色与性别、选择创建时间 `2026-09-01 ~ 2026-09-27` 后点「搜索」
- **THEN** 请求包含 `username`、`roleId`、`gender`、`createdStartTime=2026-09-01 00:00:00`、`createdEndTime=2026-09-27 23:59:59`
- **判据**:前端测试断言最后一次 `/api/users` 请求的查询串;日期边界工具函数单测

### Requirement: [FR-007] 已选条件回显

每个已生效的查询条件 **MUST** 在「已选条件」中显示为一枚标签,值为可读文本:角色显示角色名、性别与状态显示字典名称、
时间显示为「开始日期 ~ 结束日期」(只有一端时显示该端);点标签的 × **MUST** 移除该条件、回到第 1 页并清空面板中对应控件。

#### Scenario: 可读值与移除
- **WHEN** 以角色「编辑」、性别「女」搜索后,点「角色：编辑」标签的 ×
- **THEN** 标签依次显示「角色：编辑」「性别：女」;移除后下一次请求不含 `roleId`、含 `page=1`,面板角色控件为空
- **判据**:前端测试断言标签文本、移除后最后一次请求查询串,以及面板角色控件无选中值
