# E3: infrastructure 层（DO/Mapper/Repository 实现）

## 完成的 tasks.md 条目

- 4.1、4.2、4.3、4.4、4.5、4.6、4.7、4.8、4.9

## 改了什么

| 文件 | 动作 | 说明 |
|---|---|---|
| `weiran-system-infrastructure/.../entity/PamRoleDO.java`、`PamPermissionDO.java`、`PamRoleAccountDO.java`、`PamPermissionRoleDO.java`、`PamBanDO.java` | 新增 | 五张既有表的 MyBatis-Plus 实体映射 |
| `weiran-system-infrastructure/.../mapper/PamRoleMapper.java`、`PamPermissionMapper.java`、`PamBanMapper.java` | 新增 | 继承 `BaseMapper`（单一自增主键） |
| `weiran-system-infrastructure/.../mapper/PamRoleAccountMapper.java`、`PamPermissionRoleMapper.java` | 新增 | 不继承 `BaseMapper`（无主键/联合主键），用具名 SQL |
| `weiran-system-infrastructure/.../persistence/MyBatisRoleRepository.java`、`MyBatisBanRepository.java` | 新增 | 实现 `RoleRepository`/`BanRepository` |
| `weiran-system-infrastructure/.../persistence/MyBatisAccountRepository.java` | 改造 | 新增 `list`/`insert`/`existsByIdentifier`/`setEnabled`/`updateProfile` 实现，补 `toDO(Account)` 转换 |
| `weiran-system-infrastructure/.../autoconfigure/SystemInfrastructureAutoConfiguration.java` | 改造 | 正式登记 `RoleRepository`/`BanRepository` 两个 Bean（完成 E1 预留位） |

## 为什么这么做

- 关键决策：`PamRoleAccountMapper`/`PamPermissionRoleMapper` 不继承 `BaseMapper`——两表分别无主键、联合主键，`BaseMapper` 的按 ID 操作无从谈起，直接用具名 `@Insert`/`@Delete`/`@Select` SQL 更清晰，参照既有 `RbacMapper` 的先例（该文件同样不继承 `BaseMapper`）。
- 关键决策：`replacePermissions` 实现为"先 `deleteByRoleId` 全删，再逐条 `insert`"，不做批量插入优化——本次数据量级（角色的权限点数通常几十条以内）不需要批量 SQL，保持简单。
- 考虑过但放弃的方案：`MyBatisRoleRepository` 最初写了一个 `bindAccountToRole` 包内方法用于账号-角色绑定写入，但检查发现 `RoleRepository` 端口接口和任何应用服务都没有调用它——这是我自己多写的、没有消费方的代码，违反"不写没人用的方法"，已删除。账号-角色绑定的 UI 入口本身是 design.md 的 Open Question（留待后续确认放在哪个页面），DO/Mapper 层的建模按 tasks.md 4.3 要求已经做了，但绑定"写入"的应用层用例本次未实现，等 UI 入口确定后再加对应方法。

## 依赖的契约

- `RoleRepository`/`BanRepository`/`AccountRepository` 端口签名（E2 冻结）。

## 越界申报

无新增越界（E2 阶段已申报的 `Account.loginIp` 字段改动，本单元只是同步完成 `toDO`/`toDomain` 的映射代码，属于同一因果链条的收尾，不是本单元的新越界）。

## 埋的坑 / 遗留

- [ ] `PamRoleAccountMapper` 目前只有 `insert`/`deleteByRoleId` 两个方法，没有"查询账号已绑定角色"的查询方法——因为当前没有应用层用例需要它（账号-角色分配 UI 未定，见上文）。若后续补上账号管理页面的角色分配交互，需要在这个 Mapper 上补查询方法。
- [ ] `MyBatisAccountRepository.list` 的关键字模糊查询用了三个 `like` + `or`，未验证 MySQL 执行计划是否会全表扫描（账号表量级如果很大，未来可能需要加索引或改用全文索引，本次不做这个优化）。

## 自测结果

- 命令：`JAVA_HOME=$(/usr/libexec/java_home -v 21) ./gradlew :weiran-system-infrastructure:compileJava`
- 结果：BUILD SUCCESSFUL，无编译错误无警告
