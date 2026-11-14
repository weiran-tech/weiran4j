# 编写测试流程

先读运行指南与 support/steps/INDEX.md；复用实际共享步骤，不复制登录、请求或证据逻辑。

```bash
pnpm test:flows init demo/example --project api --dry-run
pnpm test:flows init demo/example --project api
pnpm test:flows step new demo/shared --dry-run
pnpm test:flows remove demo/example --dry-run
```

新增流程的 flow.json、plan.md、spec/Bruno 请求放同一目录；注册表只存声明路径。脚手架默认产生会失败的占位断言，不能把未实现示例当作成功。模板、注册表和共享步骤 INDEX 通过短时锁更新，普通异常回滚；不自动抢占未知遗留锁。

声明稳定 id=domain/name、runner、project、entry、kind、envs、tags、expectedCases、params、preconditions、verification、limitations、steps、inputs、cleanup 与 evidence.requiredAttachments。businessProject 为 weiran4j。所有实际间接共享步骤都需登记；AST 图会把本地依赖纳入代码摘要。不得有未登记 spec/请求或共享一个 entry。

read-only 不改变业务状态；transition 必须保存 before-state、after-state、cleanup-state，浏览器 transition 还需 before-screenshot/after-screenshot。每项必要证据对应本次用例的有效附件，不能借另一个用例的证据过关。秘密参数不设默认值，不写入普通运行记录。

匿名 API 使用 support/fixtures/test 的独立 backend。认证业务 fixture 为 support/fixtures/authenticated；loginAs 只登录一次，跨角色使用独立用例。HttpOnly Cookie 由 BrowserContext/storageState 处理；写请求使用同一上下文的 CSRF，不添加旧版认证头或 localStorage 主体。fixture 清理自己创建的会话，借用的缓存由操作者管理。

严格使用数字 code=0；失败核对 HTTP 状态与数字业务码。当前普通登出仅清 Cookie，不能断言旧 JWT 被吊销；真正的业务写入必须核对状态变化并验证业务清理，不以退出会话冒充回滚。不要自动修改种子、密码、权限或 token_version 来凑测试前提。

敏感用例在 spec 中显式 `test.use({ trace: 'off', screenshot: 'off', video: 'off' })`，原始凭据操作日志要替换为固定错误。白名单状态由 attachState 保存，页面截图仅在非敏感阶段显式生成。

修改后执行：

```bash
pnpm test:flows:check
pnpm test:flows:browser
pnpm test:flows run demo/example --env local
```

最后一项需要专用真实环境。分别记录离线、合成和真实执行结果；缺前提应说明并失败，不能跳过或放宽复核。源项目的 test-flows/、合同/返利/STS 不是本仓测试来源或执行入口。
