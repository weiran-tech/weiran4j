# 版本说明数据

```text
releases.json                         仅 current、activeVersion
pages.json                            稳定页面目录
page-baselines.json                   固定基线的完整页面清单
versions/<版本>/version.json           元信息，不含 changes
versions/<版本>/changes/<pageId>.json   单个页面的 CHG 分组
```

页面分组示例：

```json
{
  "pageId": "prototype-versions",
  "changes": [
    { "id": "CHG-015", "platform": "manage", "title": "版本 JSON 按版本与页面拆分" }
  ]
}
```

示例仅展示组织结构，实际 CHG 仍须填写 type、pageTitle、page、location、before、after、rules、exceptions、acceptance 等字段。组内不再填写 pageId，组装时从文件顶层继承；同页多条 CHG 合并在同一数组。版本编号与目录、pageId 与文件名必须匹配。

浏览器读取 `src/prototype/source-catalog.ts`，Node 工具读取 `scripts/load-prototype.mjs`；二者复用纯组装器 `prototype/manifest.mjs`。页面不直接导入单个版本文件。Git 历史读取兼容旧大 JSON，冻结比较基于组装后的内容，排版与对象键顺序不构成语义变化。

状态为 in_progress / completed，只允许唯一进行中版本，activeVersion 与 current 指向它。先登记 editBase 与本版 CHG，再修改实现；完结前提交实现并登记 implementationRef。subtree 来源同时保留对应目录树引用。完整产品仍沿固定基线链继承、覆盖、删除；缺少历史快照时不以当前实现替代。

已完结版本不可重写。网页仅保存本机评审，支持截图及导出，不修改源码。操作见站内版本管理指南；不关联远程任务或讨论；固定归档和迁移前版本原文继续保留。
