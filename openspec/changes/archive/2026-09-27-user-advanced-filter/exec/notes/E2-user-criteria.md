# E2: UserCriteria 扩展

## 完成的 tasks.md 条目

- `2.2`

## 改了什么

| 文件 | 动作 | 说明 |
|---|---|---|
| `weiran4j/weiran-system/weiran-system-domain/src/main/java/com/weiran/system/domain/user/UserCriteria.java` | 改造 | 新增 10 个规范化组件,性别为 `Gender`,时间命名为 `createdFrom/To`、`lastLoginFrom/To`(领域语义,不带接口命名) |

## 为什么这么做

- 关键决策:domain 只依赖 JDK 与 weiran-common(`EnableStatus`),不引框架类型(CP-1/CP-2)。

## 依赖的契约

- `UserCriteria`(domain record)

## 越界申报

| 文件 | 为什么不得不改 | 性质(必要连带/越界扩大) | 是否可能影响其他单元 |
|---|---|---|---|
| 无 | — | — | — |

## 埋的坑 / 遗留

- 无

## 自测结果

- 结果:`./gradlew :weiran-system-domain:test` 通过
