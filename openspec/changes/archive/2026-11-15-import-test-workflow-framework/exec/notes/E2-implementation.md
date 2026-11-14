# E2: 严格执行与证据复核

## 完成的 tasks.md 条目

- 1.2

## 改了什么

| 文件 | 动作 | 说明 |
|---|---|---|
| tests/framework/{batch,process,core,catalog,inspect,bruno}.mjs；tests/framework/unit/core.test.mjs；tests/unit/cli.test.mjs；tests/framework/browser/framework.integration.mjs | 新增/适配 | 严格执行与证据复核 |

## 为什么这么做

- 关键决策：保留默认零重试、独立 run/batch、原始与再次复核分离、附件摘要。失败/跳过/flaky/断言降级/空跑/报告损坏均不可通过；进程组超时与取消被记录为失败。
- 考虑过但放弃：原样复制源业务/旧认证会形成错误覆盖；自动起服务或使用种子密码超出已批准执行前提；均未采用。

## 依赖的契约

- exec/plan.md §4：流程、报告。

## 越界申报

无超出归属范围的变更。

## 埋的坑 / 遗留

- 真实业务环境与专用账号未提供；本单元不宣称真实业务通过。覆盖边界见 tests/docs/coverage.md。
- 无待处理实现项；本次未修改 packages/、源项目或历史迁移。

## 自测结果

- 51 项回归通过；真实 CLI/Bruno 对隔离服务、取消与强制回收用例通过。
- 汇总证据：exec/evidence/flows-check.log、flows-browser.log；工程及文档日志单独保存。
