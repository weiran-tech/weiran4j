# E11: 并入搜索栏改造

## 完成的 tasks.md 条目

- `5.5`

## 改了什么

| 文件 | 动作 | 说明 |
|---|---|---|
| `web/src/components/SearchToolbar.tsx`、`web/src/styles/global.css` | 核对(未再改) | 本会话此前未提交的搜索栏改造:`leading` / `advanced` + `SearchField` / `conditions` / `onRefresh`,胶囊标签及缩小 |

## 为什么这么做

- 关键决策:按 interview #6 并入,不再改其结构;本 change 只往 `advanced` 里放字段。

## 依赖的契约

- `SearchToolbar` 的 `advanced` / `SearchField` / `conditions`

## 越界申报

| 文件 | 为什么不得不改 | 性质(必要连带/越界扩大) | 是否可能影响其他单元 |
|---|---|---|---|
| 无 | — | — | — |

## 埋的坑 / 遗留

- 无

## 自测结果

- 结果:前端全量 215/215 通过
