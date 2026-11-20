# 证据与报告

## 目录与批次

只读用例目录保存在 `.artifacts/catalog/`，明确标记未执行；原生界面中的 Skipped 是目录展示，不计入执行历史。

每次非 dry-run 选择生成 batchId 和批次记录，实际执行项另有 runId。资源恢复编号与二者不同，不混用。

| 位置（相对 tests） | 内容 |
| --- | --- |
| `.artifacts/batches/<batchId>/batch.json` | 范围、环境、各项状态、数量、原因及 runId |
| `.artifacts/batches/<batchId>/report/` | 统一 Playwright 原生 HTML 及已复制的附件 |
| `.artifacts/runs/<runId>/run.json` | 流程快照、代码摘要、地址、参数名、进程状态与耗时 |
| `.artifacts/runs/<runId>/results.json` | 原生工具结果 |
| `.artifacts/runs/<runId>/verification.json` | 首次严格复核，后续不覆盖 |
| `.artifacts/runs/<runId>/reverification.json` | 独立后续复核 |
| `.artifacts/runs/<runId>/results/` | 用例附件 |

统一报告汇总 API/E2E/Bruno 原生结果与 execution 执行器检查，不为展示而重跑业务。阻塞和未执行可映射为带原因的 skipped，但批次仍未完整通过；不能只看业务用例绿色。

## 查看与复核

```bash
pnpm test:flows report
pnpm test:flows report <batchId或runId>
pnpm test:flows report <batchId或runId> --dry-run
pnpm test:flows verify <runId>
pnpm test:flows history --env local
pnpm test:flows stats --env local
```

report 默认定位最近有效批次，也支持指定环境、批次或所属运行。读取已有材料生成原生 HTML，历史孤立 HTML 可保留访问；查看不改变首次结果。报告服务仅监听本机并提供当前报告及经核验复制的附件。

严格复核核对原始进程状态、入口与 project、实际用例数量、结果摘要及每个用例的必要附件。当前实现采用 v2 证据记录，对附件核验归属、摘要、非空与 JSON 格式；部分跳过、flaky、断言降级、空跑、损坏或缺失附件均失败。

首次失败或缺首次完整结果，不能靠后续复核改写为首次成功。修复后应重新运行；旧证据保留。代码摘要不同只能说明版本变化，旧运行不代表当前代码通过。

feedback 记录人工判断，不修改执行结论；useful 反馈须绑定当前严格复核通过的运行。统计同时区分原始结果与后续复核。证据用于本地复核，不构成外部可信签名，也不能代替断言审查。

## 敏感材料

普通报告只保存白名单状态与明确的非敏感页面。不记录密码、token、Cookie、认证头、完整 storageState、云临时凭据、完整业务响应或敏感输入错误日志。

认证及会话复用过程关闭自动 trace/video/截图。非敏感阶段确需页面证据时显式生成；其他 trace 在分享前也要检查。复制附件前校验真实路径，拒绝从 `.local/` 或本次运行范围外取文件。

凭据、会话和恢复清单留在忽略的 `.local/`，普通运行产物留在忽略的 `.artifacts/`，不跨项目复制。真实审计日志按产品规则保留，不能为清理测试痕迹而删除。
