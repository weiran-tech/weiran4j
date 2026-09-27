# E4: 应用服务规范化

## 完成的 tasks.md 条目

- `3.1`

## 改了什么

| 文件 | 动作 | 说明 |
|---|---|---|
| `weiran4j/weiran-system/weiran-system-application/src/main/java/com/weiran/system/application/user/UserApplicationService.java` | 改造 | `page()` 组装扩展后的 `UserCriteria`:字符串 `Texts.trimToNull`,性别 `Gender.filterOf`,ID 与时间原样 |

## 为什么这么做

- 关键决策:去首尾空白与空串视为不过滤统一在这里做,与既有 `keyword` 一致;部门展开逻辑不动。

## 依赖的契约

- `UserQuery`、`UserCriteria`、`Gender.filterOf`

## 越界申报

| 文件 | 为什么不得不改 | 性质(必要连带/越界扩大) | 是否可能影响其他单元 |
|---|---|---|---|
| 无 | — | — | — |

## 埋的坑 / 遗留

- 无

## 自测结果

- 结果:编译通过;行为由 E5 的集成测试覆盖
