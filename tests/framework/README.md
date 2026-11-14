# 测试框架

该目录只放执行器、模板和框架自身回归；真实业务流程在 `../api/`、`../e2e/` 与 `../bruno/`，共享代码在 `../support/`。对外入口保持根目录 `pnpm test:flows`，内部入口为 cli.mjs，Playwright 配置集中在 tests/playwright.config.ts，不提供旧文件路径或命令兼容层。

## 模块职责

| 文件/目录 | 职责 |
| --- | --- |
| cli.mjs | 参数校验、命令分发、工具调用、执行及复核 |
| core.mjs | 流程契约、注册表、环境、代码摘要与严格报告校验 |
| inspect.mjs | TypeScript AST 依赖、步骤索引、发现核对与 HTTP 探测 |
| bruno.mjs | OpenCollection 配置输入与不执行脚本的语法检查 |
| batch.mjs | 串行批次及全部选中项状态摘要 |
| process.mjs | 子进程、总超时、取消与进程组收尾 |
| session.mjs | 角色凭据、远端主体、缓存、撤销及幂等恢复 |
| browser.mjs | 非持久人工登录窗口适配 |
| scaffold.mjs | 流程/步骤失败骨架及注册表/INDEX 更新 |
| maintenance.mjs | 删除预览、共享步骤保护及异常回滚 |
| catalog.mjs | 历史、统计、反馈与模块化规则 |
| utils.mjs | 短时文件锁和稳定错误 |
| templates/ | 按 runner 分类的失败占位模板 |
| unit/ | 框架离线回归，包括临时仓库与原生 CLI |
| browser/ | 真实 Chromium + 随机本地合成 HTTP 服务 |

业务步骤的离线装配测试位于 `../unit/`；它们与框架单测由同一根脚本执行。所有模块显式接收 tests 根路径，cli 从自身位置定位，不能把 framework 当成业务工作区根。

## 修改后的检查

```bash
pnpm test:flows:check
pnpm test:flows:browser
pnpm openspec:check
pnpm openspec:validate
```

首项直接执行框架与系统步骤单测，不依赖真实账号或服务；浏览器回归单独需要 Chromium 和本机启动权限。不得将临时服务、模拟浏览器或合成账号结果算作真实业务覆盖。

根 pnpm 统一依赖，不在 framework 新建 package.json、锁文件或独立安装。框架模块与真实本地依赖参与流程代码摘要，目录变化会改变当前版本，旧证据保持原样并提示版本不同。

## 设计边界

只维护 weiran4j，直接修改本地源码并用 Git 管理版本，不引入源包同步、跨项目统计、插件协议或调度服务。批次不是额外的运行数据库，history/stats 直接读取产物，feedback 使用本地 JSONL。

验证始终严格：首次结果保留，后续复核单独记录；部分跳过、flaky、断言降级、附件损坏或缺失均不能通过。blockedReason 只表达已知前提，不增加流程生命周期。会话恢复不等于业务回滚。

脚手架与删除共用短时锁，普通异常回滚文件；3 秒占用超时，不自动抢占未知遗留锁，不承诺掉电事务。锁不包围网络请求。会话与恢复材料保存在 tests/.local，历史证据仍在 tests/.artifacts；整理目录不移动或清除它们。

使用者看[运行指南](../docs/running.md)，新增业务流程看[编写流程](../docs/writing-flows.md)，实际覆盖看[覆盖范围](../docs/coverage.md)。

## 当前协议

Cookie storageState 取代源项目的浏览器本地存储主体。API 与浏览器使用数字成功码和 CSRF；普通登出清 Cookie，不宣称旧 JWT 被吊销。默认 API 5200 / web 5202，无独立 Actuator。源参考提交 507cac6；仅迁入通用框架和 7 条系统流程，不维护跨项目同步关系。
