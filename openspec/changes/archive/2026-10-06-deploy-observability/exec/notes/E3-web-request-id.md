# E3: 前端展示请求号 requestId

## 完成的 tasks.md 条目

- 3.1、5.4（未勾选，交 orchestrator）

## 改了什么

| 文件 | 动作 | 说明 |
|---|---|---|
| `web/src/utils/request.ts` | 改造 | `ApiError` 增加末位可选参数与只读字段 `requestId`；新增 `pickRequestId`（失败体 → 响应头）；`fail()` 追加请求号并 `console.warn`；会话失效、解析失败、业务失败三条分支都带上 |
| `web/src/types/api.ts` | 新增 | `ApiErrorBody` |
| `web/src/utils/__tests__/request.test.ts` | 改造 | `respond` 支持响应头；新增 6 个 requestId 用例 |

## 为什么这么做

- 关键决策：Toast 只显示前 8 位，完整值进 console.warn 与 ApiError，兼顾界面简洁和可 grep。`requestId` 仅在有值时赋值，避免出现 `requestId: undefined` 自有属性。
- 放弃方案：新增统一 Toast 组件展示完整号（超出 DS-6 范围）；成功响应也读头（无用途）。

## 依赖的契约

- plan.md 第 4 节：失败响应体 `requestId`（可选读取）、响应头 `X-Request-Id`（失败体缺失时退回）。

## 越界申报

| 文件 | 为什么不得不改 | 性质(必要连带/越界扩大) | 是否可能影响其他单元 |
|---|---|---|---|
| 无 | | | |

## 埋的坑 / 遗留

- [ ] 网络错误（code -1）没有 requestId，Toast 文案不变。
- [ ] 浏览器跨域时 `X-Request-Id` 头默认不可读；当前前后端同源（经 Nginx），不受影响。
- [ ] `res.headers?.get` 用了可选链，兼容测试里手写的 Response mock。

## 自测结果

- 命令：`pnpm --filter @weiran/web lint` / `test` / `build`
- 结果：lint 无报错；27 个测试文件 244 个用例全过；build 成功（仅有既有的 rolldown direct eval 警告）。
