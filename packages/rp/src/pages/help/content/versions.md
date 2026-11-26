# 版本管理

版本由 AI 对话维护源码，网页只负责阅读目录、体验原型和记录本机评审。版本清单位于 `/versions`，详情位于 `/versions/<版本>/rp/versions`。旧创建、编辑入口统一进入本指南。

## 开始一次修改

1. 明确目标版本与已完结基线。在 `prototype/versions/<版本>/version.json` 登记唯一 `in_progress` 版本，`prototype/releases.json` 只维护指针，`activeVersion` 和 `current` 指向它，`editBase` 使用开始修改前的完整提交 SHA。因本项目会通过 subtree 导出，还需登记该提交的 rp 目录树 SHA 到 `editBaseTree`，让独立仓库可以定位相同源码。当前为 v0.8，基线 v0.2。
2. 新增页面先登记 `prototype/pages.json`，保留稳定页面编号。为本版新增、修改、删除登记 CHG；共享组件、样式、Mock 的变化在受影响 CHG 的 `files` 中列出具体范围。
3. 执行 `pnpm version:work -- v0.8`，再通过 AI 修改页面与说明。运行 `pnpm lint`、`pnpm test`、`pnpm build`，布局需浏览器检查。

无进行中版本时禁止修改页面。已有进行中版本时不能再开第二个。没有进行中版本后，可执行 `pnpm version:new -- v0.9 "版本标题" v0.8` 登记下一版本，再通过 AI 完善目标、页面和 CHG。

## 阅读与评审

“原型与改动”按端、模块和页面组织目录，`scope=all` 查看完整产品，`scope=version` 查看本版改动。完整产品只沿所选基线继承，覆盖本版修改、排除删除，不混入其他兄弟版本。历史页面缺少固定快照时明确不可打开，不使用当前页面补位。

进行中版本可在“评审记录”填写记录人和意见，关联端、页面和 CHG，上传或粘贴截图；每条最多 6 张，每张 1 MB。可编辑已有记录。内容只存在当前浏览器，不上传 GitHub，也不自动改变版本状态。

评审可按版本导出 JSON 或带图片的 HTML；打开 HTML 后可打印 PDF。网页关闭评审后已有记录继续可读、可导出。页面 Ctrl / Cmd + Shift + E 的旧本机备注保留独立存储与批量导出，历史截图工具保留原有导出能力。

## 完结并冻结

先提交页面实现，通过 AI 将完整提交 SHA 登记为 `implementationRef`，同时将该提交的 rp 目录树 SHA 登记为 `implementationTree`（兼容 subtree 导出），状态改为 `completed`，并清空 `activeVersion`。新构建将关闭评审新增和编辑。已完结版本不能重新改写；后续调整创建下一版本。

`pnpm version:check` 已接入启动、lint、test、build。它核对唯一进行中版本、基线、页面与 CHG、`editBase` 以来的实现文件；CI 可以 `pnpm version:check --base <SHA>` 对比历史冻结记录。

## 历史兼容

迁移前的版本说明保存在 `prototype/history/releases-before-source-workflow.json`，旧状态以 `legacyStatus` 留存。v0.1–v0.7 已停止本轮修改，v0.8 继续进行；“已完结”不代表历史 GitHub 评审被补批或业务已验收。

固定 `/releases/<id>/` 快照保留，旧归档不重建、不替换；已删除远程评审关联、同步和批准工具。本项目继续沿用自己的管理端、手机端业务示例和部署方式。

## JSON 文件组织

```text
prototype/
├── releases.json                current、activeVersion
├── pages.json                   稳定页面目录
├── page-baselines.json          固定基线清单
└── versions/
    └── v0.8/
        ├── version.json         版本元信息（不含 changes）
        └── changes/
            └── prototype-versions.json
```

每个页面分组顶层为 `pageId` 和 `changes`。同一页面的多条 CHG 放在同一数组，CHG 内不再重复填写 pageId；页面编号从分组继承。其余改动字段不变。

网页和工具通过统一读取层组装，页面不直接读取分组文件。拆分前的 Git 记录仍可读取；历史版本只变更存储组织，原说明内容不重写。

版本详情以四项概览展示基线、日期、改动页面数与 CHG 数量。“原型与改动”支持双端分段筛选、搜索页面或改动编号、筛选模块；页面按模块显示为紧凑卡片，卡片内可阅读改动说明或打开原型。完整产品与本版改动范围继续保留在地址中；窄屏自动换行并使用单列卡片。
