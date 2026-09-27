# E5: 仓储查询条件与集成测试

## 完成的 tasks.md 条目

- `3.2`
- `6.2`

## 改了什么

| 文件 | 动作 | 说明 |
|---|---|---|
| `weiran4j/weiran-system/weiran-system-infrastructure/src/main/java/com/weiran/system/infrastructure/persistence/MybatisUserRepository.java` | 改造 | `page()` 追加 `eq` / `ge` / `le` 与角色子查询 `apply("id in (select user_id from sys_user_role where role_id = {0})", roleId)` |
| `weiran4j/weiran-app/src/test/java/com/weiran/app/UserRoleIT.java` | 改造 | 新增 `advancedFilters` 用例与 `userIds` 辅助方法 |

## 为什么这么做

- 关键决策:角色用子查询不用 join——一人多角色不会重复,`total` 正确;`{0}` 占位走参数绑定。可空的 `last_login_at` 用 `>=` / `<=` 比较时 NULL 天然不命中,正好满足「传了登录时间即排除从未登录」,不需要额外 `isNotNull`。
- 放弃:`inSql` 拼接 role_id(虽为 Long 无注入面,仍选参数绑定);`join` + `distinct`(改动分页计数,风险更大)。

## 依赖的契约

- `UserCriteria` 全部组件

## 越界申报

| 文件 | 为什么不得不改 | 性质(必要连带/越界扩大) | 是否可能影响其他单元 |
|---|---|---|---|
| 无(`UserRoleIT.java` 在本单元拥有文件内) | — | — | — |

## 埋的坑 / 遗留

- 无

## 自测结果

- 结果:`./gradlew :weiran-app:test --tests com.weiran.app.UserRoleIT`:10/10 通过(含新用例与未改断言的 `userCrud`);断言可区分——若忽略 `username` 参数,`containsExactly` 会因返回整页而失败。另加一条 `+` 编码的时间参数断言,锁住前端 `URLSearchParams` 的编码与后端解析的兼容性
