# E1: 统一流程框架、声明与依赖

## 完成的 tasks.md 条目

- 1.1

## 改了什么

| 文件 | 动作 | 说明 |
|---|---|---|
| tests/framework/{cli,core,catalog,maintenance,scaffold,utils,inspect,bruno,process,batch}.mjs；tests/registry.json；tests/playwright.config.ts；tests/tsconfig.json；package.json；pnpm-lock.yaml；.gitignore | 新增/适配 | 统一流程框架、声明与依赖 |

## 为什么这么做

- 关键决策：仅迁入源提交 507cac6 的跟踪文件；排除私有材料、合同/返利业务与旧 test-flows。集中四项工具版本，唯一锁文件由本仓 pnpm 生成。保留 CLI/AST/维护锁/脚手架。
- 考虑过但放弃：原样复制源业务/旧认证会形成错误覆盖；自动起服务或使用种子密码超出已批准执行前提；均未采用。

## 依赖的契约

- exec/plan.md §4：流程、环境、报告。

## 越界申报

| 文件 | 为什么不得不改 | 性质 | 是否可能影响其他单元 |
|---|---|---|---|
| pnpm-workspace.yaml | Bruno 引入 protobufjs 的 postinstall，被 pnpm 严格安装策略拦截；显式设为 false，跳过仅输出建议的脚本，不放开其他构建脚本 | 必要连带 | 安装策略；frozen install 已通过 |
| tests/unit/{cli,framework,inspect}.test.mjs | 源框架回归实际位于 tests/unit，计划测试归属的 framework/unit 路径只是概括；保留实际分组 | 必要连带 | E4 复用，不复制重复测试 |

## 埋的坑 / 遗留

- 真实业务环境与专用账号未提供；本单元不宣称真实业务通过。覆盖边界见 tests/docs/coverage.md。
- 无待处理实现项；本次未修改 packages/、源项目或历史迁移。

## 自测结果

- 离线深度检查通过，51 项回归通过，锁文件安装通过。
- 汇总证据：exec/evidence/flows-check.log、flows-browser.log；工程及文档日志单独保存。
