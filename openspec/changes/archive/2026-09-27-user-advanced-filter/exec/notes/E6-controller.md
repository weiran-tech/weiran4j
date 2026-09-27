# E6: Controller 参数绑定

## 完成的 tasks.md 条目

- `4.1`

## 改了什么

| 文件 | 动作 | 说明 |
|---|---|---|
| `weiran4j/weiran-system/weiran-system-adapter/src/main/java/com/weiran/system/adapter/web/UserController.java` | 改造 | `page()` 新增 10 个 `@RequestParam(required = false)`;时间为 `LocalDateTime`,由全局格式化器绑定 |

## 为什么这么做

- 关键决策:复用全局 `LocalDateTime` 格式化与 `MethodArgumentTypeMismatchException` → 40000,Controller 不做任何校验与状态码判断(CP-11)。

## 依赖的契约

- `GET /api/users` 查询参数、`UserQuery`

## 越界申报

| 文件 | 为什么不得不改 | 性质(必要连带/越界扩大) | 是否可能影响其他单元 |
|---|---|---|---|
| 无 | — | — | — |

## 埋的坑 / 遗留

- 无

## 自测结果

- 结果:集成测试 `userId=abc`、`createdStartTime=2026-13-01` 均返回 40000
