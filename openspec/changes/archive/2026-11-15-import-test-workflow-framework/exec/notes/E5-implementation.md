# E5: 根命令与 CI 接入

## 完成的 tasks.md 条目

- 2.2

## 改了什么

| 文件 | 动作 | 说明 |
|---|---|---|
| package.json；.github/workflows/ci.yml | 新增/适配 | 根命令与 CI 接入 |

## 为什么这么做

- 关键决策：新增测试工作流根命令与独立 Node24 离线 job，原 Gradle/Vitest/前端/规格 job 保留。普通 CI 不启动业务服务或注入账号，不要求 Chromium 下载。弃用源项目 Turbo 耦合，根命令直接运行 tests 工具。
- 考虑过但放弃：原样复制源业务/旧认证会形成错误覆盖；自动起服务或使用种子密码超出已批准执行前提；均未采用。

## 依赖的契约

- exec/plan.md §4：流程、环境、认证、报告。

## 越界申报

无超出归属范围的变更。

## 埋的坑 / 遗留

- 真实业务环境与专用账号未提供；本单元不宣称真实业务通过。覆盖边界见 tests/docs/coverage.md。
- 无待处理实现项；本次未修改 packages/、源项目或历史迁移。

## 自测结果

- pnpm test:flows:check 通过：类型/发现/注册/Bruno 语法及 51 项测试。actionlint 不在本机，PyYAML 解析与四 job/Node24/离线命令断言通过。frozen install 通过。远端 CI 未触发。
- 汇总证据：exec/evidence/flows-check.log、flows-browser.log；工程及文档日志单独保存。
