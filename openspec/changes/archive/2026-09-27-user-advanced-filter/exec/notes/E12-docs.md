# E12: 组件文档与现状文档

## 完成的 tasks.md 条目

- `5.6`

## 改了什么

| 文件 | 动作 | 说明 |
|---|---|---|
| `openspec/rules/advisory/components.md` | 改造 | `SearchToolbar` 条目:面板字段描述改为单字段查询,补 `toDayRange` 与静默忽略的提醒 |
| `openspec/state/bizs/sys_user.md` | 改造 | 筛选项表补 8 行口径;#08 移入 changelog 标为已关闭;#09 改为随本 change 提交 |

## 为什么这么做

- 关键决策:按 AGENTS.md「state/ 读写时机」③④ 处理。

## 依赖的契约

- 最终代码行为

## 越界申报

| 文件 | 为什么不得不改 | 性质(必要连带/越界扩大) | 是否可能影响其他单元 |
|---|---|---|---|
| 无 | — | — | — |

## 埋的坑 / 遗留

- 无

## 自测结果

- 结果:`node openspec/check.mjs` 全绿
