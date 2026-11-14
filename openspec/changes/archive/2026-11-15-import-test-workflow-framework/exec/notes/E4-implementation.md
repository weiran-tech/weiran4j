# E4: 七条系统流程与共享步骤

## 完成的 tasks.md 条目

- 2.1

## 改了什么

| 文件 | 动作 | 说明 |
|---|---|---|
| tests/{api,e2e,bruno,support,unit,envs}；tests/registry.json；tests/framework/browser/framework.integration.mjs | 新增/适配 | 七条系统流程与共享步骤 |

## 为什么这么做

- 关键决策：7 条声明按当前数字错误码、公开存活、匿名鉴权、登录入口、Cookie 登录/授权快照/CSRF/登出改写。共享步骤索引对应实际依赖。无账号回退或默认种子密码。owned fixture 清理本次会话，borrowed fixture 校验并保留外部拥有的缓存；认证禁自动 trace/video/screenshot，仅手工白名单证据。
- 考虑过但放弃：原样复制源业务/旧认证会形成错误覆盖；自动起服务或使用种子密码超出已批准执行前提；均未采用。

## 依赖的契约

- exec/plan.md §4：流程、环境、认证、清理、报告。

## 越界申报

无超出归属范围的变更。

## 埋的坑 / 遗留

- 真实业务环境与专用账号未提供；本单元不宣称真实业务通过。覆盖边界见 tests/docs/coverage.md。
- 无待处理实现项；本次未修改 packages/、源项目或历史迁移。

## 自测结果

- 51 项离线回归通过（含系统 API 步骤损坏 JSON/快照/清理失败）；真实 Chromium + 合成 HTTP 中通过 CLI 执行全部 5 条 Playwright/2 条 Bruno。真实业务未运行。
- 汇总证据：exec/evidence/flows-check.log、flows-browser.log；工程及文档日志单独保存。
