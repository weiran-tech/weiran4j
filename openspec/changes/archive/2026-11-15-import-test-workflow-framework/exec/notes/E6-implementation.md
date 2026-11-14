# E6: 文档和现状入口

## 完成的 tasks.md 条目

- 3.1

## 改了什么

| 文件 | 动作 | 说明 |
|---|---|---|
| tests/{README.md,docs,framework/README.md}；docs/testing.md；docs/.vitepress/config.mts；README.md；AGENTS.md；openspec/state/bizs/artifact.md | 新增/适配 | 文档和现状入口 |

## 为什么这么做

- 关键决策：记录实际命令、专用凭据配置、Cookie/CSRF、安全恢复、存活与 JWT 自然过期边界。覆盖表区分离线/合成/真实，源项目通过记录不继承。docs 导航及 AGENTS 接入统一规则；未新增业务页面或组件。
- 考虑过但放弃：原样复制源业务/旧认证会形成错误覆盖；自动起服务或使用种子密码超出已批准执行前提；均未采用。

## 依赖的契约

- exec/plan.md §4：全部已实现契约。

## 越界申报

无超出归属范围的变更。

## 埋的坑 / 遗留

- 真实业务环境与专用账号未提供；本单元不宣称真实业务通过。覆盖边界见 tests/docs/coverage.md。
- 无待处理实现项；本次未修改 packages/、源项目或历史迁移。

## 自测结果

- pnpm build:docs 通过；七条流程声明深度检查通过。现状明确真实环境未运行。
- 汇总证据：exec/evidence/flows-check.log、flows-browser.log；工程及文档日志单独保存。
