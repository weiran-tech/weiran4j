# 运行与检查

以下命令在 weiran4j 仓库根执行。以本仓测试框架为基线，使用 Node 24、根 pnpm 依赖和 Turbo；精确版本与浏览器安装要求查看根声明、锁文件及[项目测试入口](../testing.md)。

## 浏览与执行

```bash
pnpm test:flows list
pnpm test:flows list --text
pnpm test:flows list --json
pnpm test:flows list --no-open
pnpm test:flows list --type api --tag permission --json

pnpm test:flows run --env local
pnpm test:flows run --type api --tag permission --env local
pnpm test:flows run --runner bruno --env local
pnpm test:flows run domain/example --env local --dry-run
```

`list` 默认生成并打开可视化目录，明确标记“未执行”；不执行测试体、fixture、hook 或 Bruno 脚本。`--no-open` 只生成目录。`--text`、`--json` 互斥，输出流程定义且不生成目录。

`run` 无筛选时选择全部已登记 API/E2E/Bruno 流程。框架自身回归不在该业务批次内。筛选条件取交集，无匹配应报错；`--project` 和 `--all` 不是当前统一 CLI 的公共参数。执行前先确认范围及项目写入前提。

dry-run 仅预览，不执行、不落运行产物，不能计为通过。浏览器执行可选择互斥的 `--headed`、`--headless`、`--ui`，选项只作用 Playwright，不阻断混合批次中的 Bruno。默认不重试，避免重复写入。

## 检查层次

| 入口 | 验证范围 |
| --- | --- |
| `pnpm test:flows check` | 声明、环境、步骤依赖与索引、模块化约束 |
| `pnpm test:flows check --deep` | 增加 TypeScript、完整发现与数量、Bruno 配置及脚本语法 |
| `pnpm test:flows:check` | 深度检查 + Turbo 编排框架与步骤离线单测 |
| `pnpm test:flows:browser` | Chromium 与临时合成服务的框架回归 |
| `pnpm test:api:synthetic` | 项目已提供的 API fixture、协议及资源恢复合成回归 |
| `pnpm test:flows doctor --env local` | 探测项目声明的服务与工具条件，不启动业务服务 |
| `pnpm test:flows run ...` | 选定环境中的实际流程；是否真实业务环境须在结果中注明 |

原生 Playwright 可以通过 `--list` 发现声明；实际执行须经统一 CLI 生成批次和严格复核。原生发现示例：

```bash
pnpm exec playwright test --config tests/playwright.config.ts --list
```

Bruno 深度检查解析 OpenCollection `.yml` 和编译脚本，不执行请求或脚本，不等于业务断言验收。

## Turbo 编排

根 package.json 使用：

```json
{
  "scripts": {
    "test:flows:unit": "node --test tests/framework/unit/*.test.mjs tests/unit/*.test.mjs",
    "test:flows:check": "node tests/framework/cli.mjs check --deep && turbo run test:flows:unit"
  }
}
```

根 turbo.json 的 tasks 中登记：

```json
{
  "//#test:flows:unit": { "cache": false }
}
```

框架回归使用 Node test runner，Turbo 只负责编排且每次真实执行。浏览器和 API 合成回归保持独立命令，不接入 Vitest；根 `test` 是否汇总其他测试由项目约定，不把它当成全框架验收入口。

命令回归使用每次进程独立的临时工作区，复制非私有输入、复用已安装依赖，目录和历史产物只在临时工作区生成，结束后回收。不复制真实 `.local/`、`.artifacts/` 或个人浏览器 profile。

## 环境与失败

环境文件只保存地址和非秘密入口。地址优先级为 CLI 覆盖 > 对应环境变量 > `envs/<env>.json`；参数优先级为 `--param NAME=VALUE` > `FLOW_<NAME>` > 非秘密默认值。秘密不从命令行传入。

服务、数据库、账号和浏览器由操作者按项目指南准备；doctor 与执行器不自动启停已有业务服务。健康检查的含义由项目说明，不能把存活结果扩大为全部依赖可用。

已知阻塞不读取凭据、不执行该流程，其余可用项继续；配置或参数准备失败则不启动整批。普通流程失败后继续，超时或取消停止后续项并记录未执行原因。只有全部选中项完整通过才返回零。

SIGINT/SIGTERM 收尾和工具进程回收受平台实现约束；SIGKILL、崩溃和掉电不能保证 finally 执行。遗留 running/pending 不算通过，按[资源恢复](resources.md)核查后再运行。
