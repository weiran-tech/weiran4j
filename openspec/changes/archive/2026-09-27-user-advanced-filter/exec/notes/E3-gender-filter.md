# E3: Gender.filterOf

## 完成的 tasks.md 条目

- `2.3`
- `6.1`

## 改了什么

| 文件 | 动作 | 说明 |
|---|---|---|
| `weiran4j/weiran-system/weiran-system-domain/src/main/java/com/weiran/system/domain/user/Gender.java` | 改造 | 新增 `filterOf`:空白 → null,其余委托 `of` |
| `weiran4j/weiran-system/weiran-system-domain/src/test/java/com/weiran/system/domain/user/UserTest.java` | 改造 | 新增 `parsesGenderFilter`:null / 空白 / 合法值 / 非法值 40000 |

## 为什么这么做

- 关键决策:不能复用 `Gender.of`——它把空值解析成 `UNKNOWN`,拿来过滤会让「不传性别」变成「只查未知性别」,默认列表静默缩水(违反 FR-005)。口径照抄 `EnableStatus.filterOf`。

## 依赖的契约

- `Gender.filterOf`

## 越界申报

| 文件 | 为什么不得不改 | 性质(必要连带/越界扩大) | 是否可能影响其他单元 |
|---|---|---|---|
| 无 | — | — | — |

## 埋的坑 / 遗留

- 无

## 自测结果

- 结果:`./gradlew :weiran-system-domain:test` 通过
