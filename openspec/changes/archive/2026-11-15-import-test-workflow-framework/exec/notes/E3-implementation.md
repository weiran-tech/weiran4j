# E3: Cookie/CSRF 会话及私有恢复

## 完成的 tasks.md 条目

- 1.3

## 改了什么

| 文件 | 动作 | 说明 |
|---|---|---|
| tests/framework/{session,browser,cli}.mjs；tests/framework/unit/{session.test,cookie-fixture}.mjs；tests/unit/framework.test.mjs；tests/framework/browser/framework.integration.mjs | 新增/适配 | Cookie/CSRF 会话及私有恢复 |

## 为什么这么做

- 关键决策：以 Cookie jar/storageState 代替旧 Bearer/localStorage 主体。绑定环境、角色、两地址、有效期、远端 id/username；私有文件 0600，目录 0700；路径/链接检查；失败保留恢复材料。写请求从同一 jar 获取 CSRF。人工窗口为独立非持久上下文。普通登出仅清 Cookie，不声称旧 JWT 吊销。
- 考虑过但放弃：原样复制源业务/旧认证会形成错误覆盖；自动起服务或使用种子密码超出已批准执行前提；均未采用。

## 依赖的契约

- exec/plan.md §4：认证、清理、环境、报告。

## 越界申报

无超出归属范围的变更。

## 埋的坑 / 遗留

- 真实业务环境与专用账号未提供；本单元不宣称真实业务通过。覆盖边界见 tests/docs/coverage.md。
- 无待处理实现项；本次未修改 packages/、源项目或历史迁移。

## 自测结果

- 51 项回归通过；真实 Chromium 合成服务验证 HttpOnly、缓存复用、清理/恢复及失败隐私通过。
- 汇总证据：exec/evidence/flows-check.log、flows-browser.log；工程及文档日志单独保存。
