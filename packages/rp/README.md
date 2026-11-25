# Weiran Prototype

面向产品、评审与研发的独立纯前端原型项目：制作可操作原型，明确每版改动，通过 GitHub Discussion 留下评审结论，再把定稿要求交给研发。

## 开始使用

第一次参与项目，请先看[新成员上手：下载、协作、部署与合并](src/pages/help/content/onboarding.md)。

本地开发、构建和发布统一使用 **Node.js 24.x**，pnpm 版本由 `packageManager` 固定。使用 nvm 时可先执行 `nvm install && nvm use`。

```bash
pnpm install --frozen-lockfile
pnpm dev
```

全部命令在本仓库根目录执行，统一端口 **5208**，端口占用直接报错。

- 主入口：http://localhost:5208/。

- 管理端：[http://localhost:5208/manage](http://localhost:5208/manage)，演示登录 `admin / admin123`。
- 手机端：[http://localhost:5208/mobile/](http://localhost:5208/mobile/)，Vue + Vant。
- 使用指南：[http://localhost:5208/help](http://localhost:5208/help)，与主入口共用站点外壳，可直接访问。

首页 `/` 提供入口，版本清单 `/versions` 展示全部版本，使用指南 `/help/<文章>` 为全局入口，均不携带版本。具体版本由路径确定：说明与原型 `/versions/v0.8/rp/versions`、管理端 `/versions/v0.8/manage/...`、手机端 `/versions/v0.8/mobile/`。`scope=version` 看本版改动，`scope=all` 看继承基线后的完整产品；未修改页面继续保留，删除项从完整目录移除。旧 `version` 参数只在无版本快捷入口用于迁移，进入版本路径后清除。

## 协作与演示

- **协作管理**：版本清单、使用说明、创建版本（仓库 JSON）、版本改动、Discussion 评审、定版归档。
- **原型演示**：合并到 `/versions/<版本>/rp/versions?scope=all` 的“原型与改动”，按端、模块和页面分组；旧 `/rp/demo` 地址保留参数跳转。
- **完整产品**：已定版基线 + 本版新增 / 修改 / 删除，按端和稳定页面编号合并；同基线其他版本不会自动混入。
- **版本评审**：创建 Discussion 后执行 `pnpm version:review -- v0.8 discussion:编号`。登记、分页同步、本人确认和归档门禁均支持 Discussion；历史 Issue 保留兼容。详见[评审说明](src/pages/help/content/review.md)。

## 产研工作流

首页提供版本管理入口，独立 `/versions` 页面展示版本清单；版本详情、说明编辑和原型目录共用首页公共导航，可直接访问，不进入管理端或手机端外壳。版本内统一通过“原型与改动 / 评审与结论”进入，无需选择岗位；技术信息按需展开，维护摘要直接展示，站内不提供交接编辑和版本归档操作。页面与改动记录由 AI 编程工具通过源码制作；站内只维护版本记录，不提供改动记录增删改。版本详情统一承载页面目录、改动与只读评审，旧原型演示地址兼容跳转；说明通过按钮和抽屉阅读。

版本决定内容，完整 / 差异决定查看范围，管理端 / 手机端决定页面端。版本切换保留协作外壳、分区和范围，支持浏览器前进后退；历史业务内容仍读取固定归档。

1. **产品制作**：在版本中心确认目标与基线，制作页面，逐项填写前后行为、业务规则、异常和验收条件。
2. **组织评审**：固定候选，每版一个 GitHub Discussion，独立问题按评论串承接，产品明确采用、暂缓或不采用，并复核最终原型。
3. **研发接单与验收**：按定稿 CHG 关联真实任务，提测提供 PR、环境和构建，产品按原条件本人验收。业务发布独立记录。

顶部按“完整 / 差异 → 版本 → 管理端 / 手机端”选择；“差异”按端和业务模块组织本版页面，“完整”查看所选版本的完整产品，历史版本使用对应固定快照。原型协作、管理端产品和手机端产品分区；组件示例不作为导航入口。

历史原型读取固定快照；缺少快照时不以当前代码代替。`embed=page` 隐藏导航、侧栏、顶部、Tab 和协作工具，仅保留页面；完整产品使用 `embed=full`。

本机保存只是草稿，已登记的 GitHub Discussion 是共享评审来源，历史 Issue 继续保留。Mock 与会话仅用于演示，没有业务后端和数据库。手机端与管理端的演示数据独立，不模拟真实跨端业务。

## 一个工程，两个入口

```text
rp/
├── src/main.tsx         React + Semi 管理端入口
├── src/pages/           管理端页面及使用指南
├── src/mobile/          Vue + Vant 手机端
├── mobile/index.html    /mobile/ 页面入口
├── vite.config.ts       一次启动与构建两端
├── prototype/           共享版本、改动、评审与演示规则
└── scripts/             归档、交接同步、构建与部署
```

添加管理端页面后在 `src/mocks/seed.ts` 登记，新增数据契约同时补 `src/mocks/transport.ts`。版本说明维护于 `prototype/releases.json`；使用指南源文件位于 `src/pages/help/content/`。组件从 npm `@weiran-tech/semi-components` 引用。

## 检查与部署

```bash
pnpm lint
pnpm test
pnpm build:site
pnpm check:site
```

上传根目录 `dist/` 即可部署管理端、手机端、使用指南及已恢复的历史版本，不需要独立文档服务。Vercel 导入仓库时保持根目录，构建和路由由 `vercel.json` 配置；也可执行 `node dist/serve.mjs`，默认使用 5208。

详细操作见[快速开始](src/pages/help/content/start.md)、[评审操作](src/pages/help/content/review.md)、[研发与验收](src/pages/help/content/delivery.md)和[候选与部署](src/pages/help/content/deployment.md)。评审及交接记录在[本版主 Issue #5](https://github.com/weiran-tech/rp-example/issues/5)，线上预览为[团队演示站](https://rp-example.vercel.app)（保留 Vercel 登录保护）。

所有产品和 AI 页面操作先明确目标版本，执行 `pnpm version:work -- <版本>`。新版本只从已评审定稿版派生；同基线同页冲突须先实际解决并登记内容绑定的证据，未解决会阻止工作与构建。版本详情支持双端介绍、本机评审备注和批量导出；快捷键 Ctrl / Cmd + Shift + E，支持选择或粘贴图片，数据只存本浏览器。

应用源码和工具配置统一位于项目根目录，不再包含嵌套的 packages/manage 包。`pnpm build` / `pnpm build:web` 将双端产物写入 `.prototype-data/web-build/`，`pnpm build:site` 组装完整可部署站点到 `dist/`。在 mono4j 根运行 `pnpm dev` 时由 Turbo 一并启动本原型（5208）；也可在本目录单独运行 `pnpm dev`。
