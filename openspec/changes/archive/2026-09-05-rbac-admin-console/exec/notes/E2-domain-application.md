# E2: domain + application 层（聚合根/端口/应用服务）

## 完成的 tasks.md 条目

- 3.1、3.2、3.3、3.4、3.5、3.6、3.7、3.8、3.9、3.10

## 改了什么

| 文件 | 动作 | 说明 |
|---|---|---|
| `weiran-system-domain/.../rbac/RoleAggregate.java` | 新增 | 角色可编辑聚合根，`updateProfile()` + `ensureDeletable()` |
| `weiran-system-domain/.../rbac/PermissionRef.java` | 新增 | 权限点只读引用 |
| `weiran-system-domain/.../rbac/Ban.java` | 新增 | 封禁聚合根 |
| `weiran-system-domain/.../port/RoleRepository.java`、`BanRepository.java` | 新增 | 角色/封禁仓储端口 |
| `weiran-system-domain/.../port/AccountRepository.java` | 改造 | 新增 `list`/`insert`/`existsByIdentifier`/`setEnabled`/`updateProfile` 五个方法 |
| `weiran-system-domain/.../account/Account.java` | 改造 | 新增 `loginIp` 字段（必要连带，见下方越界申报） |
| `weiran-system-domain/.../error/SystemErrors.java` | 改造 | 新增 `ROLE_NOT_FOUND`/`SYSTEM_ROLE_NOT_DELETABLE`/`BAN_NOT_FOUND`/`ACCOUNT_IDENTIFIER_CONFLICT` |
| `weiran-system-application/.../rbac/RoleApplicationService.java`、`PamApplicationService.java`、`BanApplicationService.java` | 新增 | 三个应用服务，实现 `weiran-system-api` 的对应接口 |

## 为什么这么做

- 关键决策：`RoleAggregate.updateProfile()` 不接受 `name` 参数（而不是接受但运行时校验拒绝）——这是比 spec 场景描述的方案更强的保证，从类型层面消除"忘记校验导致系统角色被改名"的可能性。`UpdateRoleCommand`（E1 已定义）本就没有 `name` 字段，两者呼应。
- 考虑过但放弃的方案：`RoleAggregate` 曾考虑直接复用/改造现有 `rbac/Role.java`，design.md 阶段已决策放弃（见 design.md「Role/Permission 写模型设计决策」一节），本单元严格按该决策执行，未重新评估。
- `PamApplicationService.requireAccount` 的"账号不存在"错误码用 `WeiranErrors.RESOURCE_NOT_FOUND`（`weiran-common` 通用错误码）而非 `SystemErrors` 里新建一个专属错误码——账号不存在是通用语义，`SystemErrors.ROLE_NOT_FOUND`/`BAN_NOT_FOUND` 则是角色/封禁的业务专属场景，两者不对称是有意的，不是遗漏。

## 依赖的契约

- `RoleService`/`PamService`/`BanService` 接口签名（E1 冻结）——三个应用服务是这些接口的实现类。
- `PasswordHasher.hash()` 签名（既有端口，CP-8 复用）。

## 越界申报

| 文件 | 为什么不得不改 | 性质(必要连带/越界扩大) | 是否可能影响其他单元 |
|---|---|---|---|
| `weiran-system-domain/.../account/Account.java` | `rbac-account-management` spec FR-004 要求登录日志查询返回"最近登录来源 IP"，但现有 `Account` 聚合根没有暴露 `loginIp` 字段（尽管 `pam_account` 表和 `PamAccountDO` 都已有这一列，只是领域模型层没有读出来）。不加这个字段，FR-004 的场景（返回来源 IP）无法实现。 | 必要连带 | 影响 E3：`MyBatisAccountRepository.toDomain()` 的转换逻辑需要同步补上 `.loginIp(record.getLoginIp())`（本单元已顺带做了这处必要的配套修改，因为不改 `toDomain` 的话新字段永远是 `null`，这个改动与 `Account.java` 的字段新增是同一个因果链条，不算独立的越界） |

## 埋的坑 / 遗留

- [ ] `PamApplicationService.loginLogs` 返回 `PageResult<LoginLogView>` 但列表内至多一条数据——这是 E1 收尾笔记已经记录过的既定契约形状，不是本单元引入的新问题，E3/E4 实现与联调时需要知道这一点。
- [ ] `AccountRepository.updateProfile` 是本单元新增的端口方法（替代最初想直接调用 `insert` 做更新的错误设计），E3 必须在 `MyBatisAccountRepository` 里正确实现为 UPDATE 语句，不能是新增或覆盖式替换。

## 自测结果

- 命令：`JAVA_HOME=$(/usr/libexec/java_home -v 21) ./gradlew :weiran-system-domain:compileJava :weiran-system-application:compileJava`
- 结果：BUILD SUCCESSFUL（仅既有的 `UnrecognisedJavadocTag` 警告，与本单元无关，`Account.java` 原有代码就有这个警告）
