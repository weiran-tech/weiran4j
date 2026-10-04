# cqt_entries / cqt_people / cqt_entry_participants / cqt_competition_participation_keys 作品与报名（常青藤）

> 属于 `openspec/state/`，**只描述事实，不是规范**：过期不会被 `check.mjs` 拦截，**以代码为准**，发现不符回来改这里。
> 下游（weiran-cqt）业务表，索引见 [`README.biz.md`](README.biz.md)。
>
> 事实源：
> [`CompetitionController.java`](../../../weiran4j/weiran-cqt/weiran-cqt-adapter/src/main/java/com/weiran/cqt/adapter/portal/CompetitionController.java)、
> [`SignupApplicationService.java`](../../../weiran4j/weiran-cqt/weiran-cqt-application/src/main/java/com/weiran/cqt/application/entry/SignupApplicationService.java)、
> [`MyEntriesApplicationService.java`](../../../weiran4j/weiran-cqt/weiran-cqt-application/src/main/java/com/weiran/cqt/application/entry/MyEntriesApplicationService.java)、
> [`domain/entry/`](../../../weiran4j/weiran-cqt/weiran-cqt-domain/src/main/java/com/weiran/cqt/domain/entry)、
> [`MybatisEntryRepository.java`](../../../weiran4j/weiran-cqt/weiran-cqt-infrastructure/src/main/java/com/weiran/cqt/infrastructure/persistence/MybatisEntryRepository.java)、
> [`V202610051001__cqt_entries.sql`](../../../weiran4j/weiran-cqt/weiran-cqt-infrastructure/src/main/resources/db/migration/cqt/V202610051001__cqt_entries.sql)、
> [`scripts/biz/import/cqt_entries.sql`](../../../scripts/biz/import/cqt_entries.sql)。
>
> 盘点基线：change `cqt-signup`（2026-10-05）。

## 0. 概要

| 项 | 值 |
| --- | --- |
| 表 | `cqt_entries`（作品）、`cqt_people`（人员）、`cqt_entry_participants`（参赛人）、`cqt_competition_participation_keys`（参赛唯一键）、`cqt_evaluation_targets`（评审对象）、`cqt_app_sequences`（序列） |
| 结构来源 | FastAPI 2026 库最终结构 + 只加不改的 2027 列（`stage_scope`、`province_entry_id`、`attachment_type`、`declared_group_size`、`credential_type`） |
| 接口 | `POST /api-web/competition/signup`、`GET /api-web/competcategory/productlists`、`GET /api-web/competition/signupdetail`（均需前台登录） |
| 账号关联 | `cqt_people.(source_database, legacy_user_id)` = 账号的 `(source_database, legacy_user_id)` |

## 1. 列表

`productlists`：本账号作为参赛人的全部未删除作品，按作品 ID 倒序，`{data, total}`，不分页。

## 2. 字段与表单

| 表单字段 | 落库 | 规则 |
| --- | --- | --- |
| `title` / `competitionid` | `title` / `competition_id` | 必填 |
| `firstcatid` / `secaodcatid` | `first/second_category_legacy_id` | 一级启用；二级属于一级且启用 |
| `attachment_type` / `purl` / `purlname` | `attachment_*` | ZIP 须本系统地址且 `.zip`；链接 http(s) 无汉字；赛项要求附件时必填 |
| `zubie` / 成员 `group` | `group_name` / `group_snapshot` | 须在该赛事、该赛项适用的启用组别内 |
| `istuandui` / `team_members` | `entry_type` / 参赛人 | 团体 ≥ 2 人、证件不重复、学校必填、手机号格式 |
| — | `entry_no` | `WEB-<赛事ID>-<10 位序号>`，序列 `fastapi_signup_entry` |
| — | `stage_scope` | 赛事 SEPARATE 为 PROVINCIAL，否则 BOTH |

## 3. 动作

| 动作 | 规则 / 错误 |
| --- | --- |
| 报名 | 赛事不存在 404；未启用 / 未开始 / 已结束 409；赛项 / 附件 / 组别 / 成员 400；同一证件同一赛事同一一级赛项阶段冲突 409（提示已有报名号）；同阶段并发由唯一键兜底 409；全部写入一个事务 |
| 我的报名 | 见 §1 |
| 报名详情 | 非本人 403；`msg` / `step` 按 `legacy_status`；`shengAward` / `guoAward` 为 null |

## 4. 用到的公共组件

无。

## 5. 说明与建议

- 人员 `source_database` 随报名账号（修正原系统固定写 `zhongxi` 导致渠道账号看不到自己报名的缺陷）；作品 `source_database` 仍为 `zhongxi`、`source_table` 为 `fastapi_signup`（同原系统）。

## 6. 已知问题汇总

- **#01 🚧 P2 报名不可修改 / 撤回**
  原系统的 `updatesignup`、`withdraw` 未实现（uniapp 未调用）。症状：用户填错只能找后台处理（后台作品管理另开 change）。
- **#02 🚧 P2 报名详情的省奖 / 国奖为空**
  `shengAward` / `guoAward` 恒为 null，`step` 不会到 3，奖项在评审与奖项切片补上。
- **#03 🚧 P1 国赛作品提交入口未做**
  SEPARATE 赛事的国赛作品只能经学校批量导入（下一切片）提交；国赛重新组队的「省赛一等奖」校验也随导入实现。
- **#04 ⚠️ P3 2026 历史数据中同一证件可能重复参赛**
  导入回填参赛唯一键用 `INSERT IGNORE`，重复的只保留先写入的一条；不影响新届报名。

## 7. changelog

新条目插在本节最上方（按日期倒序，新在上）。

**2026-10-05**
- **#05 ✅ P? change `cqt-signup` 建立本组表与本文件**
