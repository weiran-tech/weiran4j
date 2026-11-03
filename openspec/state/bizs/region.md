# region 行政区划

> 属于 `openspec/state/`，只描述当前实现事实；以代码和已合入 Flyway 迁移为准。
>
> 事实源：[`RegionController.java`](../../../packages/server/weiran-region/weiran-region-adapter/src/main/java/com/wulicode/weiran/region/adapter/packages/manage/RegionController.java)、
> [`RegionApplicationService.java`](../../../packages/server/weiran-region/weiran-region-application/src/main/java/com/wulicode/weiran/region/application/region/RegionApplicationService.java)、
> [`Region.java`](../../../packages/server/weiran-region/weiran-region-domain/src/main/java/com/wulicode/weiran/region/domain/region/Region.java) /
> [`RegionHierarchy.java`](../../../packages/server/weiran-region/weiran-region-domain/src/main/java/com/wulicode/weiran/region/domain/region/RegionHierarchy.java)、
> [`MybatisRegionRepository.java`](../../../packages/server/weiran-region/weiran-region-infrastructure/src/main/java/com/wulicode/weiran/region/infrastructure/persistence/MybatisRegionRepository.java)、
> [`V202610190001__region_initial_schema_and_seed.sql`](../../../packages/server/weiran-region/weiran-region-infrastructure/src/main/resources/db/migration/region/V202610190001__region_initial_schema_and_seed.sql)、
> [`RegionsPage.tsx`](../../../packages/manage/src/pages/system/regions/RegionsPage.tsx)、[`RegionFormModal.tsx`](../../../packages/manage/src/pages/system/regions/RegionFormModal.tsx)、
> [`RegionSelect.tsx`](../../../packages/manage/src/components/RegionSelect.tsx)。

## 0. 概要

| 项 | 值 |
| --- | --- |
| 表 | `region` |
| 菜单 | 系统管理 › 行政区划（`sys_menu.id = 2000`） |
| 路由 | `/system/regions` |
| 页面组件 | `system/regions/RegionsPage` |
| 后端模块 | `weiran-region` 五层模块 |
| 接口前缀 | `/api/regions` |
| 权限码 | `region:list/create/update/delete/export`；`GET /lookup` 公开访问 |
| 初始数据 | `china-division@2.7.0`，3351 条（31 省、342 市、2978 县） |

## 1. 列表

`GET /api/regions/tree` 全量返回筛选后的地区树，不分页。管理树每一级同级节点按 ID 倒序，关键词命中后代时会补齐祖先；级别或状态筛选只影响命中节点，未命中的祖先仍用于维持树路径。`GET /flat` 返回筛选后的平铺列表。

| 列 | 来源 | 渲染 |
| --- | --- | --- |
| ID | `id` | 首列，倒序 |
| 地区名称 | `name` | 树缩进 |
| 区划代码 | `code` | 字符串原值 |
| 级别 | `level` | 省级 / 市级 / 县级 |
| 父级代码 | `parentCode` | 空值显示 `—` |
| 排序 | `sort` | 原值 |
| 状态 | `status` | `StatusTag` |
| 创建时间 | `createdAt` | 原值 |
| 操作 | — | 按钮权限控制 |

表格填满可用宽度，地区名称列弹性伸缩。筛选项为名称/代码关键词、级别、状态。

## 2. 字段与表单

新增与编辑使用 [`RegionFormModal`](../../../packages/manage/src/pages/system/regions/RegionFormModal.tsx)。

| 字段 | 规则 | DB 列 |
| --- | --- | --- |
| 区划代码 `code` | 必填；2–12 位数字；创建后不可修改 | `varchar(12)`，唯一 |
| 地区名称 `name` | 必填；最多 64 字符 | `varchar(64)` |
| 级别 `level` | `province` / `city` / `county` | `varchar(16)` |
| 父级代码 `parentCode` | 省级为空；市级父级为省；县级父级为市 | `varchar(12) null` |
| 排序 `sort` | 新增默认 0；编辑未传时保持原值 | `int` |
| 状态 `status` | `enabled` / `disabled`；新增默认启用 | `varchar(16)` |

表包含 bigint 自增 ID 与创建/更新时间审计字段；`parent_code` 和 `(level,status)` 有索引。

## 3. 动作

| 动作 | 接口 | 权限码 | 规则 |
| --- | --- | --- | --- |
| 查询树 / 平铺 / 详情 | `GET /tree`、`GET /flat`、`GET /{id}` | `region:list` | 全量筛选，不分页 |
| 新增 | `POST /` | `region:create` | code 唯一；父级存在且恰好高一级 |
| 编辑 / 启停 | `PUT /{id}` | `region:update` | code 不可变；校验父级关系、自环与后代环；级别调整不得使子级层级失效 |
| 删除 | `DELETE /{id}` | `region:delete` | 仅允许删除叶节点 |
| 导出 | `GET /export` | `region:export` | 当前筛选条件下全部匹配记录，UTF-8 BOM CSV |
| 注册/登录态选择数据 | `GET /lookup` | 公开 | 仅返回启用地区及其完整启用祖先路径 |

新增、修改、删除写操作记录 `@OperationLog`。本下游分配错误码：`40040` 层级/父级无效，`40940` code 重复，`40941` 节点仍有子级。菜单号段为 `2000`–`2099`。

## 4. 用到的公共组件

- `PageContainer`、`SearchToolbar`、`ColumnSettings`、`TableActions`、`Permission`、`StatusTag`
- [`RegionSelect`](../../../packages/manage/src/components/RegionSelect.tsx)：地区级联选择器，受控值为 code 字符串路径，只显示启用节点。
- [`regions.ts`](../../../packages/manage/src/hooks/queries/regions.ts)：地区查询、写入与导出 hooks。

## 5. 说明与建议

- 父子关系按行政区划 code 关联，code 作为业务键保留前导零；禁止在编辑时修改 code。
- 初始快照 SQL 注明数据包版本与 WTFPL v2 许可；后续快照修订追加新迁移，不修改已执行迁移。
- 地区为全国公共数据，不按用户或租户隔离。
- 管理树按 ID 倒序满足当前列表规范；选择器树按业务 sort、code 升序。

## 6. 已知问题汇总

无。

## 7. changelog

新条目插在本节最上方（日期倒序）。

**2026-10-19**
- **#01 ✅ P2 新增地区行政区划模块**
  新建 `region` 表及 3351 条固定行政区划快照，提供树/平铺/详情、CRUD、启停、筛选、CSV 导出、公开 lookup、管理页面和 `RegionSelect`。
