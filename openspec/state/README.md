# state/ —— 现实是什么样,以及还欠着什么

> **这个目录回答「现在实际长什么样」和「已知但还没动的问题」。**
> 它与相邻两个目录是三种不同的时态:
>
> | 目录 | 时态 | 回答 |
> | --- | --- | --- |
> | [`rules/`](../rules/) | **现在必须** | 我该遵守什么 |
> | [`design/`](../design/) | **过去为什么** | 这套流水线为什么长这样 |
> | **`state/`** | **现状 + 将来** | 现在实际是什么样,还欠着什么没做 |

## 准入标准

进这里的东西有一个共同点:**它描述事实或欠账,不是规范。**
过期了不会让任何检查变红 —— 唯一会受影响的是读它的人。

| 类型 | 位置 | 说明 |
| --- | --- | --- |
| 逐表现状 + 已知问题 | [`bizs/`](bizs/) | 每张表一份 `bizs/<table>.md`,八段结构;跨模块业务口径在 `bizs/cross-biz.md`,架构 / 技术问题在 `bizs/artifact.md`。约定与索引见 [`bizs/README.md`](bizs/README.md) |
| **流水线自身待办池** | [`design/README.md`](../design/README.md) 附录 | **不在本目录。** schema / 模板 / 校验 / 目录结构 / skill 自身的欠账写在那里 |

**约定:项目里盘点出的待处理问题,一律放进本目录** —— 属于某张表的写进对应 `bizs/<table>.md` §6,
找不到单一归属的:业务口径写 `bizs/cross-biz.md`,架构 / 技术写 `bizs/artifact.md`;流水线自身的写
`design/README.md` 附录。不要散落在各人的笔记或某个 change 的 `exec/verify.md` 里 ——
那样它们会随 change 归档一起沉底,再也没人翻得到。

## 怎么维护

**新增**:写进对应文件 §6,以 `- **#NN {状态} {优先级} 标题**` 起头(编号取该文件当前最大号 + 1),
并写清**症状**(谁会拿到错的东西)。引用某条时同文件写 `#NN`,跨文件写 `文件名.md#NN`。

**关闭**:整条(编号不变,状态改 ✅)从 §6 移到同一文件的 §7 changelog,按日期倒序,注明是哪个 change 关的。
只解决了一部分的留在 §6,状态写「部分解决」。

**模块说明**:发现内容与代码不符,**以代码为准**,并回来改对应的 `bizs/<table>.md`。

机械兜底只有一条:`openspec/guards/state-waitlist.mjs` 校验编号(文件内重号、悬空引用、已废止的全局编号)。
其余全靠 `CLAUDE.md`「`state/` 的读写时机」一节唤起。

---

## 管理页共用骨架

本节是 8 个系统管理页共用的前端结构,**不属于任何单一表**。逐表差异见 `bizs/<table>.md`,
读单张表的文档前先读本节,否则文档里「沿用共用骨架」几个字背后的行为就是空的。

### 页面结构

```
PageContainer                       外壳卡片
└── SearchToolbar                   左:筛选控件 + 查询/重置;右:新增按钮(包在 <Permission> 里)
└── Table                           Semi Table,服务端分页(page / pageSize,默认 20)
    └── 操作列                       编辑 / 删除等,各自包 <Permission code="...">,删除走 Popconfirm
└── XxxFormModal / XxxSheet         新增与编辑共用一个表单弹窗(或侧边抽屉)
```

- 数据走 `web/src/hooks/queries/<资源>.ts` 的 TanStack Query hooks;写操作成功后 invalidate 对应列表。
- 请求走 `web/src/utils/request.ts`:`code === 0` 成功,其余抛 `ApiError` 并 Toast 提示 `message`。
- 树形资源(菜单、部门)不分页,用 Semi Table 的树形数据,「新增下级 / 子项」预填 `parentId`。
- 公共组件清单与各自的坑见 [`rules/advisory/components.md`](../rules/advisory/components.md)。

### 后端结构

每个资源一条纵切:`*-adapter` 的 `XxxController`(`@RequiresPermission` + `@OperationLog`,请求 DTO 带 Bean Validation)
→ `*-application` 的 `XxxApplicationService`(事务边界)→ `*-domain` 的聚合与规则(纯 Java,有单测)
→ `*-infrastructure` 的 `MybatisXxxRepository` + `XxxDO` + `XxxMapper`。

### 共用口径

| 口径 | 说明 |
| --- | --- |
| 状态 | `status: "enabled" \| "disabled"`,前端用 `StatusTag` 渲染 |
| 内置数据 | `is_builtin = 1` 的行不能删(`40901`);部分字段不可改(如内置角色的 `code`) |
| PUT 语义 | 未传的可选字段**保留原值**(不是重置为默认值) |
| 唯一冲突 | 编码 / 用户名 / 配置键重复返回 `40900` |
| 树防环 | 菜单、部门不能挂到自己或后代下(`40901`) |
| 时间 | JSON 里 `yyyy-MM-dd HH:mm:ss`(Asia/Shanghai) |
| 布尔标志 | 库里 tinyint,JSON 里一律 boolean |
