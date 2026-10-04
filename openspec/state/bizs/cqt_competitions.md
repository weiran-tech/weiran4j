# cqt_competitions / cqt_competition_categories / cqt_competition_groups 赛事、赛项、组别（常青藤）

> 属于 `openspec/state/`，**只描述事实，不是规范**：过期不会被 `check.mjs` 拦截，**以代码为准**，发现不符回来改这里。
> 下游（weiran-cqt）业务表，索引见 [`README.biz.md`](README.biz.md)。
>
> 事实源：
> [`CompetCategoryController.java`](../../../weiran4j/weiran-cqt/weiran-cqt-adapter/src/main/java/com/weiran/cqt/adapter/portal/CompetCategoryController.java)、
> [`CompetitionQueryApplicationService.java`](../../../weiran4j/weiran-cqt/weiran-cqt-application/src/main/java/com/weiran/cqt/application/competition/CompetitionQueryApplicationService.java)、
> [`Competition.java`](../../../weiran4j/weiran-cqt/weiran-cqt-domain/src/main/java/com/weiran/cqt/domain/competition/Competition.java)、
> [`MybatisCompetitionRepository.java`](../../../weiran4j/weiran-cqt/weiran-cqt-infrastructure/src/main/java/com/weiran/cqt/infrastructure/persistence/MybatisCompetitionRepository.java)、
> [`V202610051000__cqt_competitions.sql`](../../../weiran4j/weiran-cqt/weiran-cqt-infrastructure/src/main/resources/db/migration/cqt/V202610051000__cqt_competitions.sql)、
> [`scripts/biz/import/cqt_competitions.sql`](../../../scripts/biz/import/cqt_competitions.sql)、[`scripts/biz/seed/competition_next.sql`](../../../scripts/biz/seed/competition_next.sql)。
>
> 盘点基线：change `cqt-signup`（2026-10-05）。

## 0. 概要

| 项 | 值 |
| --- | --- |
| 表 | `cqt_competitions`（届）、`cqt_competition_categories`（赛项，全局）、`cqt_competition_groups`（组别，按赛事） |
| 结构来源 | FastAPI 2026 库最终结构；`cqt_competitions` 另加 `national_entry_mode`（SHARED / SEPARATE） |
| 菜单 / 页面 | 无后台页面（后台赛事管理另开 change）；uniapp「作品提交」表单 |
| 接口 | `competitionlists`、`getsecondcat`、`secondcategory`、`groups`（均公开） |
| 数据来源 | 历史：`cqt_competitions.sql` 导入；新届：`competition_next.sql` 种子 |

## 1. 列表

无后台列表。前台 `competitionlists` 按年份、ID 倒序，可按 `status`、`name` 过滤。

## 2. 字段与表单

| 列 | 说明 |
| --- | --- |
| `status` | 1 启用（可报名）、0 停用草稿、2 已结束（2026 届） |
| `registration_start` / `registration_end` | 报名时间窗，空为不限 |
| `national_entry_mode` | SHARED 省国赛共用作品（前台报名记 BOTH）；SEPARATE 分别报名（前台记 PROVINCIAL，国赛作品走导入） |
| 赛项 `legacy_id` / `parent_legacy_id` | 对外 ID；一级赛项 parent 为 0；`attachment_required` 要求附件 |
| 组别 `first/second_category_legacy_id` | 0 表示该层级通用 |

## 3. 动作

| 动作 | 接口 | 规则 |
| --- | --- | --- |
| 赛事列表 | `competitionlists` | 见 §1 |
| 一级赛项 | `getsecondcat?id=<赛事>` | 赛事不存在或未启用为空；否则全局启用的一级赛项 |
| 二级赛项 | `secondcategory?id=<一级>` | 启用的二级赛项；`competition_id` 参数忽略 |
| 组别 | `groups?competition_id&firstcatid&secondcatid` | 赛事或一级为 0 时为空 |

## 4. 用到的公共组件

无。

## 5. 说明与建议

- 单库多届：届 = 赛事；服务端忽略 `X-CQTXJ-Database`。

## 6. 已知问题汇总

- **#01 ⚠️ P2 赛项全局共用，不分届**
  所有赛事共用同一套赛项（同 2026）。症状：新一届若要调整赛项（停用 / 新增），会同时影响历届赛事的赛项名称显示与报名可选项。按届区分赛项（FastAPI 2027 的 `competition_categories.competition_id`）待定。
- **#02 🚧 P2 无后台赛事管理**
  赛事、赛项、组别只能改种子脚本或直接改库。

## 7. changelog

新条目插在本节最上方（按日期倒序，新在上）。

**2026-10-05**
- **#03 ✅ P? change `cqt-signup` 建立本组表与本文件**
