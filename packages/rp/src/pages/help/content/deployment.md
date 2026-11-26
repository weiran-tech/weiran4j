# 构建与部署

发布环境统一使用 **Node.js 24.x**。GitHub Actions、候选构建和定稿归档工作流均使用 Node 24，Vercel 部署参数指定 `24.x`；源码构建同时读取根目录 `package.json` 的 `engines.node`。本地使用 nvm 时执行 `nvm install && nvm use`，读取仓库 `.nvmrc`。

推荐将 GitHub 作为版本来源，使用 Vercel 托管当前原型与历史快照。也可下载 CI 产物自行部署，无需后端与数据库。

## 一份产物，同域访问

执行 `pnpm build:site` 得到根目录 `dist/`：

| 路径 | 内容 |
| --- | --- |
| `/`、`/versions`、`/help/<文章>` | 全局首页、版本清单与指南，不携带版本 |
| `/rp/versions` | 版本详情快捷入口，自动进入版本路径；兼容旧 `version` 参数 |
| `/versions/v0.8/rp`、`/versions/v0.8/rp/versions` | v0.8 协作首页、版本说明与原型 |
| `/manage`、`/mobile/` | 当前工作版本的快捷入口，自动进入对应版本路径 |
| `/versions/v0.8/manage/` | v0.8 独立管理端工作页面 |
| `/versions/v0.8/mobile/` | v0.8 独立手机端工作页面，使用 hash 路由 |
| `/releases/index.json` | 已归档构建索引 |
| `/releases/v0.2/` | 对应版本的管理端快照（发布后可用） |
| `/releases/v0.2/mobile/` | 同一版本的手机端快照 |

构建会将 `.prototype-archives/` 中的快照一同复制，检查版本、路径和源码提交。快照独立构建资源路径与 BrowserRouter basename，刷新深层地址仍指向该版本。缺失快照明确显示不可预览，不以当前页面替代。

版本路径、基线继承与历史预览规则见[版本管理与历史](./versions.md)。

## GitHub 工作流

main 发布会先按内容摘要复用托管平台已有资源，仅补齐缺失文件，小文件可随部署请求提交，避免反复上传全部历史快照。相同分支只保留最新一次检查与发布任务。发布遇到限流或错误时不标记成功，线上保留上一次可用部署。[Vercel 部署接口说明](https://vercel.com/docs/rest-api/deployments/create-a-new-deployment)。

- main / PR：说明校验、lint、测试、构建与路由检查。main 恢复历史快照；PR 不使用发布凭证。`prototype-site` artifact 保存 30 天。
- **Build review candidate**：手动从 main 构建固定候选，发布 prerelease 附件 `v0.8-rc-<40位提交>.tar.gz`，组装完整站点。候选不是定稿，旧候选保持可追溯。
- **Freeze prototype version**：当前版本 completed 后推送同名 tag；HEAD 须在 main 中，核对源码版本、implementationRef 与准确 tag 后归档。
- **Refresh prototype site**：手动触发后，重建 main 的站点摘要和完整历史。已有 Release 附件先核对身份再续跑，拒绝覆盖。

本地 `pnpm candidate` 要求 in_progress 且工作区干净。`pnpm snapshot -- v0.8` 要求 completed、implementationRef、准确 tag 与主分支提交。归档目录和产物均被 Git 忽略。


## Vercel：发布已检查的静态产物

当前站点：[协作首页](https://rp-example.vercel.app/)，站点需要 Vercel 身份验证。候选归档路径为 `/releases/<候选编号>/`；从版本目录打开对应固定候选，基线为 v0.2。

已配置项目 `rp-example`，项目非敏感标识在 `prototype/hosting.json`。站点保护保持启用，团队成员需获得 Vercel 项目访问权。原型登录不是托管访问控制。

推荐 GitHub 构建完毕后运行 `scripts/deploy-static.mjs`：仅上传 `dist` 静态文件，保留 `vercel.json` 的路径配置，轮询 READY 后才报告成功。安装和构建步骤不接触 Vercel 凭证；归档读取使用 Actions 自带的 `GITHUB_TOKEN`。

维护者在 **GitHub 仓库 Settings → Secrets and variables → Actions** 直接设置 `VERCEL_TOKEN`（有该团队项目部署权限），不要通过聊天、源码或 VITE_ 变量传递。main CI、候选与站点刷新工作流均支持此方式。未配置时只产出可下载部署包，会明确报告未自动更新线上。首次通过已授权连接器发布不等于此 Secret 已配置。

也可选择 Vercel Git 源码构建：Other / Node 24，Install `node scripts/prepare-install.mjs && pnpm install --frozen-lockfile`，Build `pnpm build:deploy`，Output `dist`。这种方式须单独配置 `GITHUB_REPOSITORY=weiran-tech/rp-example` 和只读仓库 `GH_TOKEN`（仅读取 Releases），不要给不可信 PR 暴露凭证。推荐静态产物路径，可避免在 Vercel 存 GitHub token。

路由优先匹配文件，再分别处理管理端、mobile、releases；使用指南由管理端路由解析，旧文档链接进入指南；缺失快照和资源返回 404。官方配置说明见 [Vercel 路由](https://vercel.com/docs/project-configuration/vercel-json)。

## 自有服务器 / Docker

从 Actions → Check and build prototype 的成功 main 运行下载 `prototype-site`（需仓库读取权限）。解压后直接包含 `dist/index.html`、`dist/serve.mjs`、`dist/assets/`、`dist/mobile/` 和 `dist/releases/`，避免多套目录。main 产物含恢复的历史快照；本地构建只含本机已有快照。

将完整 `dist/` 上传到本次构建目录（替换示例账号和目录）：

```bash
ssh deploy@your-server "mkdir -p /srv/rp-example/build-001"
scp -r dist deploy@your-server:/srv/rp-example/build-001/
ssh deploy@your-server
cd /srv/rp-example/build-001
```

执行以下命令启动；前台运行关闭终端会停止，长期运行使用团队服务管理器或 Docker：

```bash
PORT=5208 node dist/serve.mjs
```

服务器已包含正确的管理端、手机端、文档与历史版本路由；缺失静态资源和缺失快照返回 404，HTML 与索引 JSON 不长缓存。

也可使用提供的静态镜像配置（先准备 dist）：

```bash
docker build -f Dockerfile.static -t weiran-prototype .
docker run -d --restart unless-stopped --name rp-example -p 5208:5208 weiran-prototype
```

将源码中的 `Dockerfile.static` 和完整 `dist/` 放在同一构建目录。切换前停止占用端口的旧实例，保留上一份部署包和镜像用于回退。

如果使用 Nginx，必须分别配置 `/mobile/`、`/releases/<version>/` 与管理端的回退路径；不能将所有请求都回退到根 index.html。已有的 Node 静态服务器可避免这类配置遗漏。

部署后检查 `/manage/login`、`/rp/versions`、`/mobile/#/orders`、`/help`；发布快照后检查历史订单页刷新、资源加载和两版本隔离。原型登录 `admin/admin123` 仅用于演示；如包含内部设计，请在托管平台配置站点访问控制。

## 归档后自动刷新站点

`Refresh prototype site` 在归档工作流成功后运行，也可在 Actions 手动触发。它从 main 构建当前原型，恢复 GitHub Release 附件，运行 `pnpm check:site`，再上传包含全部历史版本的 `prototype-site` 部署包。检查覆盖管理端（含使用指南）、手机端、快照提交、静态资源前缀和缺失快照 404。

需要自动更新 Vercel 时，在 Vercel 项目 Settings → Git 创建指向 main 的 Deploy Hook，并将完整地址保存到 GitHub 仓库 Secret `VERCEL_DEPLOY_HOOK`。工作流在部署包检查通过后调用；未配置时明确报告只生成产物，不触发线上发布。[Vercel Deploy Hooks 官方说明](https://vercel.com/docs/deploy-hooks)

Hook 只触发 Vercel 构建，不代表线上部署已经成功；结果以 Vercel 项目的部署状态为准。快照恢复或检查失败时停止后续步骤，既有 GitHub Release 附件保持不变。


## v0.8 的部署结果

部署脚本向 GitHub Actions Summary 和 step output 分别记录 `artifact_only` 与 `ready`。缺少 `VERCEL_TOKEN` 时显示“部署包已生成，线上未更新”；只有托管平台返回 READY 才给出线上部署已就绪及 URL。工作流总状态 success 不能替代部署结果。


共享的 `prototype/**` 及构建元数据插件参与 Turbo 缓存键；归档编号、构建类型和内容指纹也声明为构建环境输入。只更新根版本说明或共享规则时，双端构建和测试会重新执行，避免旧版本页面或过期测试结果被复用。
