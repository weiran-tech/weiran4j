# E9: 高级筛选面板 10 个字段

## 完成的 tasks.md 条目

- `5.3`
- `6.3`

## 改了什么

| 文件 | 动作 | 说明 |
|---|---|---|
| `web/src/pages/system/users/UsersPage.tsx` | 改造 | `Filters` 扩展、`toQuery` 生成新参数、面板换成设计稿的 10 个字段;导出 `toQuery` / `EMPTY_FILTERS` / `Filters` 供单测 |
| `web/src/pages/system/users/__tests__/UsersPage.test.tsx` | 改造 | 重写面板测试(字段顺序、共享草稿、搜索参数)并新增 `toQuery` 单测 |

## 为什么这么做

- 关键决策:时间范围在草稿里存 `Date[]`,发请求时才转字符串,已选条件可直接格式化日期。顶栏「关键字」不进面板(设计稿面板没有它)。用户 ID 用 `InputNumber`(整数、无步进按钮)。
- 放弃:在页面测试里操作 DatePicker——jsdom 下不可靠,改为对 `toQuery` 做单测 + 真浏览器验证。

## 依赖的契约

- `UserQuery` 类型、`toDayRange`、`SearchToolbar` 的 `advanced` / `SearchField`

## 越界申报

| 文件 | 为什么不得不改 | 性质(必要连带/越界扩大) | 是否可能影响其他单元 |
|---|---|---|---|
| 无 | — | — | — |

## 埋的坑 / 遗留

- 无

## 自测结果

- 结果:`vitest`:用户页 15/15;真浏览器(Chromium + 前端 mock 接口)选创建时间 9/1~9/5 后请求带 `createdStartTime=2026-09-01 00:00:00&createdEndTime=2026-09-05 23:59:59`
