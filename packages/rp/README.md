# Weiran Prototype

React + Semi UI 管理端与 Vue + Vant 手机端纯前端原型。通过 AI 维护源码中的版本与页面变动，在网页体验原型、记录本机评审并导出。

## 启动与验证

使用 Node.js 24.x，pnpm 版本由 `packageManager` 固定。在本目录执行：

```bash
node scripts/prepare-install.mjs && pnpm install --frozen-lockfile
pnpm dev
pnpm lint
pnpm test
pnpm build
```

端口 5208，冲突直接报错。在 mono4j 根执行 `pnpm dev` 也会通过 Turbo 启动本原型。

- 首页 `/`、版本清单 `/versions`、指南 `/help` 共用公共导航。
- 管理端 `/manage`，演示登录 `admin / admin123`。
- 手机端 `/mobile/`，使用 Vue + Vant。
- 版本详情 `/versions/v0.8/rp/versions`；版本由路径决定，`scope=all` 看完整产品，`scope=version` 看本版改动。

Mock 数据与会话仅用于浏览器演示，不代表真实身份与权限安全。管理端、手机端保留各自业务示例与布局。

## 版本与评审

版本只通过 AI 修改 `prototype/versions/<版本>/version.json` 与按页面拆分的 `changes/<pageId>.json`，网页不创建、编辑版本或批准定稿。状态为 `in_progress`（进行中）与 `completed`（已完结）；当前 v0.8 是唯一进行中版本，基线为 v0.2。`prototype/releases.json` 只保留 `current`、`activeVersion`。

修改页面前，先登记目标版本、`editBase` 和稳定页面 `prototype/pages.json`，将页面、共享组件、样式及 Mock 的变更关联本版 CHG。运行 `pnpm version:work -- v0.8` 检查目标。`version:check` 已接入启动、lint、test、build。

进行中版本可新增、编辑本机评审，关联端、页面及 CHG，并上传或粘贴截图。评审仅存当前浏览器，可按版本导出 JSON、带图片的 HTML，或通过 HTML 打印 PDF。页面快捷键 Ctrl / Cmd + Shift + E 的旧备注继续保留并显示在版本评审中，原存储不删除。

完结前先提交实现，将完整提交 SHA 登记为 `implementationRef`，状态改为 `completed` 并清空 `activeVersion`。完结后不可重写版本，也不可新增或编辑评审。后续迭代从已完结版本派生。详见[版本管理](src/pages/help/content/versions.md)和[本机评审](src/pages/help/content/review.md)。

## 目录与部署

- `src/pages/`：管理端页面与指南；新增页面同步 `src/mocks/seed.ts` 菜单。
- `src/mobile/`：Vue + Vant 手机端，`mobile/index.html` 为独立入口。
- `src/mocks/transport.ts`：浏览器数据适配器；新增契约同步补 Mock。
- `prototype/`：版本、稳定页面、固定基线与历史资料。
- `src/pages/help/content/`：同站使用指南。

组件从 npm `@weiran-tech/manage` 引用，不复制源码。功能调整同步指南。

`pnpm build` 输出双端产物到 `.prototype-data/web-build/`；`pnpm build:site` 组装可部署站点到 `dist/`，`pnpm check:site` 检查组装结果。上传 `dist/` 即可部署，也可执行 `node dist/serve.mjs` 预览。现有部署配置、固定归档与恢复机制保留，不导入参考项目的 Codeup / ESA 配置。

历史版本只打开对应固定快照，不以当前实现冒充历史。迁移前原文保存在 `prototype/history/`，旧状态以 `legacyStatus` 留存。不关联 GitHub Issue / Discussion；本机评审通过导出移交，固定候选与快照不依赖远程批准。

## 与独立原型仓库同步

`packages/rp` 使用 Git subtree 推送至 https://github.com/weiran-tech/rp-example.git 的 `main`，导出后本目录内容直接位于独立仓库根目录。

主仓 `main` 推送涉及本目录的改动时，GitHub Actions 的「同步原型子树」工作流自动执行；也可在 Actions 页面手动运行。功能分支不会自动更新独立仓库。工作流按顺序同步，使用目标仓库专用的可写部署密钥，私钥保存在主仓 Actions secret `RP_SUBTREE_SSH_KEY`，不写入代码。

也可以从主仓根执行 `pnpm sync:rp` 手动同步或重试，使用当前用户的 GitHub 权限。同步只导出已提交内容；同步失败不撤销主仓提交。若远端出现独立修改，需要先处理 subtree 历史合并，再重试，不使用强制推送覆盖。

本目录内部不维护独立 `.git`；此前嵌套仓库元数据仅作为本地忽略备份保存在 `.prototype-data/git-backup`。

独立仓库首次迁移时，`prepare-install.mjs` 会更新旧锁文件，再进行冻结安装；需先将两个新组件包发布到 npm。迁移后提交生成的 `pnpm-lock.yaml`，后续安装保持冻结。完整工作区跳过此步骤，使用根锁文件。
