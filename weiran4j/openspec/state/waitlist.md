# 待办

> 在 verify 阶段被判为「越界扩大、本次不修」的问题登记在这里（技术与业务合并同一份清单）。
> **只写在 verify.md 里等于把它埋了**——那份文件会随 change 归档进 `changes/archive/`，此后没人翻得到。
>
> 每条必须带**症状**：谁会因此拿到错的东西。没有症状的条目无法排优先级。
> 技术问题用 `T-NN` 编号，业务问题用 `B-NN` 编号，同一份索引表，互不干扰。

## 待处理

### T-001 · Gradle 配置缓存被迫关闭

**症状**：冷构建配置阶段慢几秒；所有开发者与 CI 都受影响。

Spotless 的 palantir-java-format 步骤在配置缓存恢复的类加载器里拿不到
`--add-exports` 的模块开放，导致 `IllegalAccessError` 被包成
`palantir-java-format(InvocationTargetException)` 随机报错。
详见 `gradle.properties` 里的实测记录。

**关闭条件**：Spotless 修复配置缓存兼容性，或改用不依赖 javac 内部 API 的格式化器。

### T-002 · wuli3 底座依赖本地 Maven 仓库

**症状**：新同事 clone 仓库后直接构建会失败，报找不到 `com.kjs.wuli3:*:0.1.0-SNAPSHOT`，
且错误信息不会提示需要先发布底座。CI 同样无法直接构建。

底座 wuli3-gradle 尚未发布到公司 Nexus，`settings.gradle.kts` 现在挂着 `mavenLocal()`。

**关闭条件**：拿到公司 Nexus 地址后，把 `mavenLocal()` 换成正式仓库并配置凭据。

### T-003 · 登录审计缺失

**症状**：安全事件回溯时查不到登录记录。PHP 侧有 `pam_log` 表记录每次登录，
weiran4j 目前只更新 `pam_account.login_times` 与 `logined_at`，
谁在什么时候从哪个 IP 登录过查不到。

**关闭条件**：接入底座的 `wuli3-audit-log-spring-boot-starter`（比照搬 PHP 表更合适）。

### T-004 · 单设备登录约束未实现

**症状**：同一账号可在多设备同时在线，与 PHP 侧行为不一致。
如果业务依赖「同类型设备只允许一个活跃令牌」，切流后该约束会静默消失。

PHP 侧靠 `pam_token` 表实现。weiran4j 的 JWT 是无状态的，不受此约束。

**关闭条件**：需要先做业务决策——这条规则是否保留。保留意味着令牌从无状态变有状态，
属于需要单独立项的设计变更，不要顺手加。

### T-005 · 登录日志/密码重置端点缺集成测试覆盖

**症状**：`PamService.loginLogs`（rbac-account-management FR-004）与
`PamService.resetPassword`（FR-005）两个端点的应用层逻辑已实现且编译通过，
但 `RbacAdminEndpointIT` 未对这两个端点单独写断言。若响应字段映射后续被改错
（比如 `loginedAt`/`loginIp` 顺序搞反，或重置密码后 `password_key` 没清空），
现有测试套件不会捕获，只有真实调用这两个接口的人会发现。

来自 change `rbac-admin-console` 的 verify 阶段。

**关闭条件**：为这两个端点各补一条 `RbacAdminEndpointIT` 用例，断言响应体字段与预期一致。

### T-006 · 账号-角色分配 UI 入口未定案

**症状**：`PamRoleAccountMapper`（角色-账号中间表 DO/Mapper）已建模，
但应用层没有提供"给账号分配角色"的用例，前端也没有对应交互。
管理员目前无法通过后台界面把账号绑定到角色——只能手工写 SQL 或等后续 change 补上，
在此之前新建的账号即使角色齐全也无法被赋予任何权限。

来自 change `rbac-admin-console` 的 design.md Open Question，verify 阶段确认未实现。

**关闭条件**：确定交互放在账号管理页面还是角色管理页面，补对应的应用服务用例
（`PamApplicationService` 或 `RoleApplicationService` 二选一）与前端交互，再关闭。

### T-007 · Repository 层可空字段写入 NOT NULL 列的隐患未做穷举排查

**症状**：`MyBatisBanRepository` 曾因为把可空的 `note` 字段直接透传给 MyBatis-Plus 的
`set()`，在 `pam_ban.note`（`NOT NULL DEFAULT ''`）上触发约束违反（已在
change `rbac-admin-console` 的 E6 阶段发现并修复，见该 change 的 `exec/notes/E6-测试.md`）。
`MyBatisRoleRepository`/`MyBatisAccountRepository` 是否存在同类问题（可空字段直传给
`NOT NULL` 列）未做逐字段排查——如果存在，触发条件是某个可选字段留空提交编辑请求，
症状是该接口返回 500 而不是预期的成功响应。

来自 change `rbac-admin-console` 的 verify 阶段。

**关闭条件**：对照 PHP 迁移文件逐一核对 `pam_role`/`pam_account` 涉及的可空领域字段
在 Repository 写入路径上是否都做了 null → 空字符串的规整，缺的地方补齐。

暂无业务问题（`B-NN`）。
