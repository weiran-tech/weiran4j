# 业务说明(`state/bizs/`)

> `openspec/state/bizs/` 的入口:目录约定、条目编号约定与文件索引。
>
> 属于 `state/`,**只描述事实,不是规范**:过期不会被 `check.mjs` 拦截,**以代码为准**,发现不符回来改这里。
>
> | 文件 | 放什么 |
> |---|---|
> | [`cross-biz.md`](cross-biz.md) | **公共 / 跨模块的业务定义**:业务名称 ↔ 表 ↔ 页面、关联关系、跨模块业务口径问题 |
> | [`artifact.md`](artifact.md) | **架构 / 技术问题**:不专属任何单一表的架构、共享组件、契约、测试、工具、门禁问题 |
> | `<table>.md` | 每张表一份,八段结构(见 §1) |
>
> 沿革:2026-09-26 随 openspec 移到仓库根建立(结构对齐 mono4ts 的 `state/bizs/`);
> 原 `state/waitlist.md`(`T-NN`/`B-NN` 全局编号)并入 `artifact.md`,全局编号废止。

## 1. 逐表说明目录约定

**每张表一份扁平文件**,文件名与表名一致(`bizs/<table>.md`)。单文件内部统一按

`概要 / 列表 / 字段与表单 / 动作 / 用到的公共组件 / 说明与建议 / 已知问题汇总 / changelog`

八段分组(`§0`~`§7`)。一张表内容特别多时允许在八段基础上加子小节,不强制拆成多份文件。

**图例**(字段级注释只在**有问题**时标注,没有 emoji 的字段视为正常):

| emoji | 含义 |
| --- | --- |
| ✅ | 已实现,行为符合预期 |
| 🚧 | 未实现(字段/开关存在但没接上) |
| ❓ | 待澄清(口径未定) |
| ❌ | 已确认的缺陷 |
| ⚠️ | 设计问题(能跑,但有隐患) |

**changelog 排序**:§7 按**日期倒序** —— 新条目**插在本节最上方**,不是追加到末尾;当天已有日期组就并进去。
日期组标题是单独一行的 `**YYYY-MM-DD**`,可带括号备注。**无机械校验**,排错了不会变红。

## 2. 编号约定

`已知问题汇总`、`changelog` 各节里的**每一条顶层条目**都以编号起头:

```
- **#NN {状态} {优先级} 标题**
  正文(必须写清症状:谁会因此拿到错的东西)……
```

| 部分 | 取值 |
|---|---|
| `#NN` | **文件内**独立编号,两位起(`#01`),从 1 递增 |
| 状态 | 🔴 待处理 · 🟡 部分解决 · ❓ 待确认 · 🚧 未实现 · ⚠️ 知情接受 / 仅记录 · ✅ 已解决 |
| 优先级 | `P0`~`P3`;未评估写 `P?` |

- **号码随条目终身不变,永不复用**:新条目取本文件**当前最大号 + 1**;条目关闭时**连同编号整条**
  从「已知问题汇总」移到「changelog」,状态改 ✅ —— 指向它的引用不会失效。删掉一条就让号码空着。
- **引用写法**:同文件内写 `#NN`;跨文件写 `<文件名>.md#NN`(如 `artifact.md#05`)。
- **认领**:动手处理某条前,在条目末尾追加 `→ <change 名>`。
- **机械校验**:`openspec/guards/state-waitlist.mjs`(`REPO/state-id-*`)检查文件内重号、
  `CLAUDE.md`/`openspec/{rules,design,state}` 里 `<bizs 下文件名>.md#NN` 引用是否指向存在的条目,
  以及是否又出现已废止的 `T-NN`/`B-NN`。裸 `#NN` 不校验。

## 3. 文件索引

盘点基线 `e23c511`(2026-09-26)。

| 分组 | 表 | 文件 |
|---|---|---|
| 公共 | —(跨模块业务定义) | [`cross-biz.md`](cross-biz.md) |
| 公共 | —(架构与技术问题) | [`artifact.md`](artifact.md) |
| 身份与权限(weiran-system) | `sys_user` 用户 | [`sys_user.md`](sys_user.md) |
| 身份与权限(weiran-system) | `sys_role` 角色 | [`sys_role.md`](sys_role.md) |
| 身份与权限(weiran-system) | `sys_menu` 菜单 / 权限点 | [`sys_menu.md`](sys_menu.md) |
| 身份与权限(weiran-system) | `sys_department` 部门 | [`sys_department.md`](sys_department.md) |
| 身份与权限(weiran-system) | `sys_login_log` 登录日志 | [`sys_login_log.md`](sys_login_log.md) |
| 平台能力(weiran-platform) | `sys_dict` / `sys_dict_item` 字典 | [`sys_dict.md`](sys_dict.md) |
| 平台能力(weiran-platform) | `sys_config` 系统配置 | [`sys_config.md`](sys_config.md) |
| 平台能力(weiran-platform) | `sys_operation_log` 操作日志 | [`sys_operation_log.md`](sys_operation_log.md) |
