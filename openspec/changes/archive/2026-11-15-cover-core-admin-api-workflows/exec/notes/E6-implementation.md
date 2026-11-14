# E6: 工程集成与文档

## 完成的 tasks.md 条目

- 3.1

## 改了什么

| 文件 | 动作 | 说明 |
|---|---|---|
| tests/registry.json、support/steps/INDEX.md | 扩展 | 15条注册/13个Playwright用例/2个Bruno请求，所有间接步骤完整登记 |
| tests/synthetic/*、package.json | 新增/接入 | 独立API合成验证与固定资源恢复命令 |
| tests/framework/browser/framework.integration.mjs、unit/framework.test.mjs | 适配 | 旧浏览器只运行原有7个样本，独立合成覆盖8个新增；完整发现计数保持15，不删流程过门禁 |
| docs/testing.md、tests/{README,docs/*}、state/bizs/artifact.md | 更新 | 真实运行/写开关/24位资源runId恢复/覆盖边界 |

## 为什么这么做

- 共享执行器不增加业务分支；新API不依赖浏览器，协议装配独立命令运行真实CLI/Playwright并使用隔离HTTP服务。
- 合成服务模型仅是协议替身，测试正例与故障注入验证接线与断言，不代表真实数据库/部署行为通过。
- 原有CLI取消/空跑/附件缺失/skipped/flaky/报告损坏/复核门禁完整保留；只修改预期注册数量和旧浏览器样本的精确隔离。
- 放弃：给旧浏览器替身填全部新业务逻辑，避免混淆其职责；不启动真实业务服务或使用默认种子账号。

## 依赖的契约

- exec/plan.md §4 全部共享契约；源步骤调用实际Cookie/CSRF，固定白名单状态与严格证据。

## 越界申报

- tests/synthetic/model.mjs、harness.mjs已由E1先建用于工具负例；本单元补实际HTTP适配与完整CLI装配，属于串行必要连带。
- package.json只新增test:api:cleanup和test:api:synthetic，不改原入口行为；依赖/锁文件不变。
- 其余文件均在计划拥有范围，没有packages或历史归档变动。

## 埋的坑 / 遗留

- 真实环境/专用凭据未提供，真实业务未运行；远端CI未触发，不移用历史通过结论。
- 业务恢复runId为清单文件中的24位随机编号，与CLI报告运行编号不同，文档已说明。
- Node原生载入TS有MODULE_TYPELESS_PACKAGE_JSON提示，不影响结果。

## 自测结果

- 71项完整离线回归通过，TypeScript/发现/声明/Bruno语法通过。
- 实际CLI/Playwright在隔离服务执行8条业务流程及匿名矩阵通过；显式写前提拒绝、失败后私有恢复入口、产物哨兵扫描通过。
- 原Chromium框架回归与docs构建通过，证据见exec/evidence；L7完整串行结果由verify引用。
