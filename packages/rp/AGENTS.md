# Weiran Prototype

使用简体中文协作。这是 React + Semi UI 管理端与 Vue + Vant 手机端的纯前端原型，不包含 Java、数据库或后端服务。

- 包名 `@weiran/rp`，接入 mono4j 的 pnpm 工作区与 Turbo。本目录 `pnpm dev` 启动同域演示（5208），端口冲突直接报错；指南集成在站点。
- 组件从 npm `@weiran-tech/semi-components` 引用，不复制源码。保留管理布局、动态菜单、登录页和业务演示。
- 管理页面在 `src/pages/`，菜单在 `src/mocks/seed.ts`；手机端在 `src/mobile/`。新增数据契约同步补 `src/mocks/transport.ts` 或手机端 Mock。
- 数据保存在 localStorage，仅供演示，不代表真实身份与权限安全。主色 #0064FA。
- 使用指南在 `src/pages/help/content/`，功能调整同步指南。运行 `pnpm lint`、`pnpm test`、`pnpm build`；布局改动需真浏览器检查。

## 版本管理（修改页面前必读）

- 公共首页 `/`、版本清单 `/versions`、指南 `/help` 共用 PortalLayout；管理端 `/manage`、手机端 `/mobile/` 保留自己的布局。版本详情位于 `/versions/<版本>/rp/versions`，版本只来自路径，普通参数不保留 `version`。
- 版本与 CHG 仅由 AI 修改 `prototype/versions/<版本>/version.json` 和 `changes/<pageId>.json`；网页不创建、编辑版本或批准定稿。旧 `/rp/editor` 进入维护指南。端标识始终为 `manage` / `mobile`。
- 状态仅为 `in_progress`（进行中）与 `completed`（已完结）。页面修改前必须存在唯一进行中版本，`activeVersion` 与 `current` 均指向它。先登记版本和 `editBase`（完整提交 SHA），本项目经 subtree 导出时同时登记 `editBaseTree`（该提交的 rp 目录树 SHA），再修改页面。运行 `pnpm version:work -- <版本>` 检查目标。
- 稳定页面目录在 `prototype/pages.json`。新增页面先登记，改名或调整路由保留稳定编号；新增、修改、删除关联本版 CHG。共享组件、样式和 Mock 调整在受影响页面 CHG 的 `files` 登记具体文件范围，禁止使用 `src/**` 等兜底范围。
- 完整目录沿选定基线合并，`scope=all` 看完整产品，`scope=version` 看本版改动。`prototype/page-baselines.json` 保存固定基线，不用当前菜单反推历史。
- 完结前先提交页面实现，将完整提交 SHA 登记为 `implementationRef`，跨仓导出时同时登记该提交的 rp 目录树 `implementationTree`，再将状态改为 `completed` 并清空 `activeVersion`。已完结版本及固定基线不可重写。新版本明确选择已完结基线，可使用 `pnpm version:new -- <版本> "标题" <基线>`。
- `pnpm version:check` 接入 dev、lint、test、build，检查整个 `editBase` 以来的实现与 CHG；CI 用 `--base <SHA>` 或 `PROTOTYPE_BASE_REF` 补充校验冻结记录。不得通过挪动 `editBase` 隐藏本轮改动。

## 本机评审与历史

- 进行中版本允许新增和编辑本机评审，已完结版本仅查看及导出。版本、端、页面与 CHG 必须匹配；支持图片、HTML / JSON 导出和 HTML 打印 PDF。存储适配器位于 `src/mocks/prototype.ts`。
- 页面上的 Ctrl / Cmd + Shift + E 打开本机备注，按版本隔离；旧备注与截图存储保留，不自动提交 GitHub。旧存储与新评审可分别导出。
- 历史业务页面仅打开对应固定快照，不以当前业务实现冒充历史。`/releases/<id>/` 固定归档与原有发布恢复机制保留。
- 迁移前版本说明原文保存在 `prototype/history/releases-before-source-workflow.json`；旧 Issue / Discussion、交接、批准证据和门禁工具仅作历史兼容保留。旧版状态记录在 `legacyStatus`，历史说明与快照不改写。“已完结”不代表补办或继承 GitHub 批准。
- 保留本项目业务示例、端口、部署配置和包名；参考项目的业务页面、账号数据、本地配置及历史评审不得复制过来。

## 版本 JSON 组织

- `prototype/releases.json` 只保留 `current`、`activeVersion`；每版元信息在 `prototype/versions/<版本>/version.json`，不含 `changes`。
- CHG 按稳定页面分组在 `prototype/versions/<版本>/changes/<pageId>.json`，顶层为 `{ pageId, changes }`；组内每条 CHG 不重复填写 `pageId`，其他字段保持原有契约。同页多条 CHG 保存在同一数组。
- 浏览器统一使用 `src/prototype/source-catalog.ts`，Node 工具统一使用 `scripts/load-prototype.mjs`，二者复用 `prototype/manifest.mjs`；页面不直接导入拆分文件。Git 历史读取兼容迁移前的大 JSON。
