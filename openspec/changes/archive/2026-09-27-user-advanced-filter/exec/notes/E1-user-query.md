# E1: UserQuery 扩展

## 完成的 tasks.md 条目

- `2.1`

## 改了什么

| 文件 | 动作 | 说明 |
|---|---|---|
| `weiran4j/weiran-system/weiran-system-api/src/main/java/com/weiran/system/api/user/UserQuery.java` | 改造 | record 由 3 个组件扩为 13 个,全部 `@Nullable`,时间为 `LocalDateTime` |

## 为什么这么做

- 关键决策:api 层只做搬运,不做规范化(规范化在应用服务),保持原有分工。
- 放弃:先加的 `UserQuery.basic(...)` 工厂方法——没有调用方,属多余代码,已删除。

## 依赖的契约

- `UserQuery`(api record)

## 越界申报

| 文件 | 为什么不得不改 | 性质(必要连带/越界扩大) | 是否可能影响其他单元 |
|---|---|---|---|
| 无 | — | — | — |

## 埋的坑 / 遗留

- 无

## 自测结果

- 结果:`./gradlew :weiran-system-adapter:compileJava` 通过
