# E4: adapter 层（三个 Controller + 装配登记 + 权限点录入脚本）

## 完成的 tasks.md 条目

- 4.10、4.11、4.12、4.13、4.14

## 改了什么

| 文件 | 动作 | 说明 |
|---|---|---|
| `weiran-system-adapter/.../web/dto/CreateRoleRequest.java`、`UpdateRoleRequest.java`、`AssignPermissionsRequest.java` | 新增 | 角色管理请求体 |
| `weiran-system-adapter/.../web/RoleController.java` | 新增 | 角色管理 REST 端点 |
| `weiran-system-adapter/.../web/PermissionController.java` | 新增（design.md 未声明，必要连带） | 权限点查询端点 `GET /api/v1/permissions`，见下方越界申报 |
| `weiran-system-adapter/.../web/dto/CreateAccountRequest.java`、`UpdateAccountRequest.java`、`ResetPasswordRequest.java` | 新增 | 账号管理请求体 |
| `weiran-system-adapter/.../web/PamController.java` | 新增 | 账号管理 REST 端点 |
| `weiran-system-adapter/.../web/dto/CreateBanRequest.java`、`UpdateBanRequest.java` | 新增 | 封禁管理请求体 |
| `weiran-system-adapter/.../web/BanController.java` | 新增 | 封禁管理 REST 端点 |
| `weiran-system-adapter/.../autoconfigure/SystemAdapterAutoConfiguration.java` | 改造 | `@Import` 登记四个 Controller；新增 `RoleService`/`PamService`/`BanService` 三个应用服务 Bean |
| `weiran-app/src/test/resources/schema.sql` | 改造（必要连带） | 补 `pam_ban` 表定义，供 E6 集成测试使用（原有测试 schema 缺这张表） |
| `openspec/changes/rbac-admin-console/exec/permission-seed.sql` | 新增 | 权限点录入 SQL，本地无法执行，留待发布阶段人工在目标环境执行 |

## 为什么这么做

- 关键决策（也是本单元发现的一处设计缺陷）：design.md「权限 / 数据范围」一节写"具体注解形式沿用现有鉴权基础设施"，听起来暗示存在声明式权限注解（如 `@PreAuthorize`）。实现时发现仓库里**没有**这种机制——`PermissionChecker` 是纯函数，唯一的调用方式是 Controller 显式调 `PrincipalHolder.require().ensure(权限点)`，与 `AuthController` 目前的写法（甚至没有权限校验，因为登录接口本身不需要）不完全对应，但与 `AuthorizedPrincipal.ensure()` 这个已有 API 完全吻合。三个新 Controller 全部采用这个显式调用模式，这不是新发明的机制，是把已有的 `AuthorizedPrincipal.ensure()` API 真正用起来（此前只有单测/未使用）。
- 关键决策：design.md 把 `GET /api/v1/permissions` 设计为独立顶级路径（不挂在 `/api/v1/roles` 下）。实现时发现 Spring MVC 的方法级 `@GetMapping` 路径总是与类级 `@RequestMapping` 拼接，无法用一个"跳出前缀"的路径覆盖类级映射（我最初尝试过，编译能过但运行时路径会变成 `/api/v1/roles/api/v1/permissions`，是错的）。因此新建了一个独立的 `PermissionController`（`@RequestMapping("/api/v1/permissions")`，无路径前缀冲突），复用同一个 `RoleService`（权限点查询用例仍定义在 `RoleService.listPermissions()`，只是承载它的 Controller 类换了）。这是 Spring MVC 机制决定的必然结果，不是我自选的架构调整。

## 依赖的契约

- `RoleService`/`PamService`/`BanService` 接口签名（E1 冻结），本单元的三个应用服务实现类（E2 产出）被这里正式注册为 Bean 并被 Controller 消费。
- design.md「API Design」表的 18 个端点路径与字段（除 `GET /api/v1/permissions` 的承载类调整外，全部照抄）。

## 越界申报

| 文件 | 为什么不得不改 | 性质(必要连带/越界扩大) | 是否可能影响其他单元 |
|---|---|---|---|
| `weiran-system-adapter/.../web/PermissionController.java`（新增类，design.md 只声明了 Role/Pam/Ban 三个 Controller） | design.md 把 `GET /api/v1/permissions` 设计为独立顶级路径，但 Spring MVC 不支持方法级映射跳出类级 `@RequestMapping` 前缀，必须用独立的类才能实现这个路径设计。不新建这个类，要么违反 design.md 的路径设计（改成 `/api/v1/roles/permissions`），要么根本无法实现该端点。 | 必要连带 | 影响 E6（集成测试）：需要为 `PermissionController` 也写端到端测试，覆盖范围比 tasks.md 4.10 原本设想的"三个 Controller"多了一个类（但功能本身仍在 tasks.md 4.10 的范围内，只是承载类不同） |
| `weiran-app/src/test/resources/schema.sql` | 该文件已有 `pam_role`/`pam_permission`/`pam_permission_role`/`pam_role_account` 四张表定义（供既有的 `AuthEndpointIT` 使用），但缺 `pam_ban`。E6 阶段需要对 `BanController` 做端到端集成测试，没有这张表测试无法运行。 | 必要连带 | 影响 E6：集成测试可以正常建表；不影响其他单元，因为这是纯增量式的表定义追加，不改变既有表结构 |

## 修正记录（本单元完成后、E5 前端开工前发现并修复）

- `RoleController.delete`/`BanController.delete` 最初误用 `@DeleteMapping("/{id}")`（HTTP DELETE 动词），
  与 design.md「前端 REST 交互方式决策」明确写的"不引入 PUT/DELETE"以及 API Design 表里写的
  `POST /api/v1/roles/{id}/delete`/`POST /api/v1/bans/{id}/delete` 不一致——这是实现时没有严格照抄
  design.md 表格的疏忽，不是 design.md 本身的矛盾。已改为 `@PostMapping("/{id}/delete")`，与
  design.md 完全对齐，`web/src/lib/api.ts` 因此确实不需要扩展（`del()` 方法），与 design.md 的
  预期一致。修正后重新编译通过。

## 埋的坑 / 遗留

- [ ] `exec/permission-seed.sql` 里的 `<SUPER_ROLE_ID>` 占位符需要在目标环境替换为真实角色 ID 才能执行——这是发布阶段的人工步骤，本地开发环境没有可连接的真实数据库无法验证这份 SQL 实际可执行性（语法层面是标准 SQL，未做语法检查之外的验证）。
- [ ] design.md「API Design」表如果后续要被其他人直接照抄实现（例如后续 P1/P2/P3 模块的 change），需要注意"全局资源用独立 Controller、不要指望方法级路径跳出类前缀"这条 Spring MVC 约束，这是本次踩出来的经验，design.md 本身没有记录这一点（design.md 是规划产物，不适合回写实现细节，因此这条经验记录在这份收尾笔记里）。

## 自测结果

- 命令：`JAVA_HOME=$(/usr/libexec/java_home -v 21) ./gradlew :weiran-system-adapter:compileJava`
- 结果：BUILD SUCCESSFUL，无编译错误无警告
