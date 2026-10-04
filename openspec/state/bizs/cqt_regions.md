# cqt_regions 赛区（常青藤）

> 属于 `openspec/state/`，**只描述事实，不是规范**：过期不会被 `check.mjs` 拦截，**以代码为准**，发现不符回来改这里。
> 下游（weiran-cqt）业务表，索引见 [`README.biz.md`](README.biz.md)。
>
> 事实源：
> [`CompetCategoryController.java`](../../../weiran4j/weiran-cqt/weiran-cqt-adapter/src/main/java/com/weiran/cqt/adapter/portal/CompetCategoryController.java)、
> [`MybatisRegionRepository.java`](../../../weiran4j/weiran-cqt/weiran-cqt-infrastructure/src/main/java/com/weiran/cqt/infrastructure/persistence/MybatisRegionRepository.java)、
> [`V202610041001__cqt_regions.sql`](../../../weiran4j/weiran-cqt/weiran-cqt-infrastructure/src/main/resources/db/migration/cqt/V202610041001__cqt_regions.sql)、
> [`scripts/biz/import/cqt_regions.sql`](../../../scripts/biz/import/cqt_regions.sql)。
>
> 盘点基线：change `cqt-portal-account`（2026-10-04）。

## 0. 概要

| 项 | 值 |
| --- | --- |
| 表 | `cqt_regions`（原 `cqtxj2026.regions`，只改表名；导出文件实测 34 行） |
| 菜单 / 页面 | 无后台页面；uniapp 注册页、资料页选择赛区 |
| 后端模块 | `weiran-cqt`；`CompetCategoryController` → `RegionApplicationService` → `MybatisRegionRepository` |
| 接口 | `GET|POST /api-web/competcategory/regions`（公开） |
| 对外 ID | `legacy_id`（账号的 `city_legacy_id` 引用它） |

## 1. 列表

无后台列表。前台返回 `[{id: legacy_id, pid: parent_legacy_id, name, code}]`，按 `parent_legacy_id`、`id` 升序。

## 2. 字段与表单

| 列 | 说明 |
| --- | --- |
| `legacy_id` | 唯一，对外 ID |
| `parent_legacy_id` | 上级，0 为顶级 |
| `name` / `code` | 名称 / 编码 |

## 3. 动作

| 动作 | 接口 | 规则 |
| --- | --- | --- |
| 前台列表 | `regions` | 全量返回，无分页、无缓存 |
| 账号资料解析 | `userinfo.cityname` | 按 `legacy_id` 取名称，查不到为空串 |

## 4. 用到的公共组件

无。

## 5. 说明与建议

- 赛区数据暂无维护入口（后台页面另开 change）。

## 6. 已知问题汇总

_(暂无)_

## 7. changelog

新条目插在本节最上方（按日期倒序，新在上）。

**2026-10-04**
- **#01 ✅ P? change `cqt-portal-account` 建立本表与本文件**
