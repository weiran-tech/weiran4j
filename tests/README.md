# weiran4j 测试

迁自 kr-alang-mono4j（参考提交 507cac6）的 tests/ 框架，按本项目 Cookie/CSRF、数字错误码与 5200/5202 地址适配。源项目账号、私有会话、证据、业务用例和历史通过结论没有迁入。

在仓库根使用 Node 24 和唯一 pnpm 锁文件：

```bash
pnpm install --frozen-lockfile
pnpm test:flows:check
pnpm test:flows list
pnpm exec playwright install chromium
pnpm test:flows:browser
```

离线检查不需要真实账号或业务服务；合成浏览器通过不能算真实业务通过。运行真实流程前由操作者启动本项目 API/后台并提供专用测试凭据，执行器不会代为启停业务服务。

| 目录 | 职责 |
|---|---|
| framework/ | CLI、声明/依赖检查、批次/进程/报告、会话/恢复、脚手架与自身回归 |
| api/、e2e/、bruno/ | 7 条当前系统流程、声明及 plan |
| support/ | fixture、环境/证据/多页面 helper、共享步骤与 INDEX |
| unit/ | 系统步骤离线装配回归 |
| envs/、registry.json | 非秘密环境地址和流程注册 |
| .local/ | 被忽略的专用凭据、Cookie 缓存和恢复材料，权限 0600 |
| .artifacts/ | 被忽略的批次、runId、原生结果、附件与复核 |

阅读入口：[运行指南](docs/running.md)、[编写流程](docs/writing-flows.md)、[覆盖边界](docs/coverage.md)、[框架说明](framework/README.md)。文档站入口为 [docs/testing.md](../docs/testing.md)。
