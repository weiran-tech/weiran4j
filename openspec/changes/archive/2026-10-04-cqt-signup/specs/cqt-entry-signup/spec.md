## Purpose
本能力长期负责常青藤的前台报名：参赛个人以个人或团体形式向某一届赛事的赛项提交作品，系统校验报名资格（时间窗、赛项、组别、附件）、
保证同一证件在同一届同一赛项不重复参赛（区分省赛 / 国赛阶段），生成报名号与作品、参赛人、评审对象记录，并让参赛人查看自己的报名记录与详情。

## ADDED Requirements

### Requirement: [FR-001] 报名表单校验

`POST /api-web/competition/signup` **MUST** 需要前台登录。作品名称（`title`）与赛事（`competitionid`）缺一 **MUST** 返回 400「赛事和作品名称不能为空」；
赛事不存在 **MUST** 返回 404「赛事不存在」；赛事不可报名按 `cqt-competition` FR-001 返回 409。
一级赛项（`firstcatid`）缺失 **MUST** 返回 400「赛项不能为空」；一级赛项不存在或未启用 **MUST** 返回 400「所选赛项不存在或未启用」；
二级赛项（`secaodcatid` / `secondcatid` / `majorid`，0 视为无）不存在、未启用或不属于该一级赛项 **MUST** 返回 400「所选专业不存在、未启用或不属于当前赛项」。

#### Scenario: 赛项校验
- **WHEN** 二级赛项属于另一个一级赛项
- **THEN** `code` 400「所选专业不存在、未启用或不属于当前赛项」
- **判据**:集成测试断言

### Requirement: [FR-002] 附件规则

附件类型（`attachment_type`）**MUST** 接受 `ZIP`/「文件」/「压缩包」与 `LINK`/「链接」，其它值 **MUST** 返回 400「请选择附件类型：ZIP或链接」。
一级或二级赛项要求附件（`attachment_required`）而未给附件地址（`purl`）时 **MUST** 返回 400「当前赛项要求提交作品附件」。
`LINK` **MUST** 是 `http://` 或 `https://` 开头的完整网址且不含汉字；`ZIP` **MUST** 是本系统存储产生的地址且以 `.zip` 结尾，附件名（`purlname`）若给出也须以 `.zip` 结尾。
附件名缺省时 **MUST** 取附件地址。

#### Scenario: 附件不合规
- **WHEN** `LINK` 为 `ftp://a.com`；`ZIP` 为外站地址 `https://other.com/a.zip`
- **THEN** 分别 400「链接附件必须是以http://或https://开头的完整网址」与「ZIP附件必须选择并上传本系统中的.zip压缩包」
- **判据**:领域单测与集成测试断言

### Requirement: [FR-003] 参赛人与组别

个人报名（`istuandui≠1`）**MUST** 以账号资料作为唯一参赛人（姓名、证件类型与号码、手机号、学校、性别），组别取 `zubie`；账号证件不合规时 **MUST** 返回 400「当前账号证件信息不完整：<原因>」。
团体报名（`istuandui=1`）的 `team_members`（JSON 数组或其字符串）**MUST** 至少 2 人，否则 400「团体报名至少需要两名成员」；格式错误 400「团体成员数据格式错误」；
每位成员 **MUST** 有姓名与学校、证件按 `cqt-account` 的证件规则校验、手机号为空或匹配 `1[3-9]\d{9}`、成员间证件（类型 + 号码）不重复，违反时提示带「第 N 位成员」。
每位参赛人的组别 **MUST** 非空且属于该赛事、该赛项适用的启用组别（`cqt-competition` FR-003 口径），否则 400 提示该成员姓名与组别。

#### Scenario: 团体成员校验
- **WHEN** 团体只有 1 人；或两位成员证件相同；或第 2 位缺学校
- **THEN** 分别 400「团体报名至少需要两名成员」「第2位成员证件号重复」「第2位成员学校不能为空，每位成员必须填写自己的学校」
- **判据**:领域单测断言

#### Scenario: 组别不在配置内
- **WHEN** 个人报名的 `zubie` 为未配置的「大学组」
- **THEN** 400，提示含该成员姓名与「大学组」
- **判据**:集成测试断言

### Requirement: [FR-004] 阶段与重复参赛

报名阶段 **MUST** 由赛事模式决定：`SEPARATE` 为 `PROVINCIAL`，否则 `BOTH`。
同一证件（类型 + 规范化号码）在同一赛事、同一一级赛项已有参赛记录且阶段冲突（任一方为 `BOTH`，或两者相同）时 **MUST** 返回 409，提示含该成员姓名、来源、已有报名号与作品名；
`PROVINCIAL` 与 `NATIONAL` 互不冲突。同阶段并发重复 **MUST** 由数据库唯一键（赛事、一级赛项、证件类型、证件号、阶段）拦截并返回 409「“<姓名>”已在本届同一赛项报名，请勿重复报名」。

#### Scenario: 同赛项重复报名
- **WHEN** 同一账号对同一 `SHARED` 赛事、同一一级赛项第二次报名
- **THEN** 409，提示含第一次的报名号与作品名
- **判据**:集成测试断言

#### Scenario: 省赛与国赛阶段
- **WHEN** `SEPARATE` 赛事中，某证件已有 `NATIONAL` 记录；另一证件已有 `BOTH` 记录；两人分别前台报名同一一级赛项
- **THEN** 前者成功（阶段 `PROVINCIAL`），后者 409
- **判据**:集成测试（测试数据直接插入 `NATIONAL` / `BOTH` 唯一键记录）断言

### Requirement: [FR-005] 报名写入

校验通过后系统 **MUST** 在一个事务内写入：作品（报名号 `WEB-<赛事ID>-<10 位序号>`，序号取自应用序列 `fastapi_signup_entry`；`entry_type` 个人 `INDIVIDUAL` / 团体 `TEAM`；
`status=ACTIVE`、`legacy_status=1`、`scoring_scope=ENTRY`、`stage_scope` 按 FR-004、`declared_group_size`=人数、`attachment_type`、赛区、学校编号、指导教师、专业、首位成员组别）；
每位成员一条人员（第一位记账号的 `legacy_user_id`）与一条参赛人（第一位为队长，按顺序排序，记学校与组别快照）；每位成员一条参赛唯一键；一条 `ENTRY` 型评审对象。
成功 **MUST** 返回 `{productid: <作品ID>, entry_no: <报名号>}`。任一步失败 **MUST** 整体回滚。

#### Scenario: 个人报名成功
- **WHEN** 账号对启用中的 `SHARED` 赛事、带合法 ZIP 附件与已配置组别个人报名
- **THEN** `code` 200 返回 `productid` 与形如 `WEB-<赛事ID>-0000000001` 的报名号；库中作品 1、人员 1、参赛人 1（队长）、唯一键 1（`BOTH`）、评审对象 1
- **判据**:集成测试查库断言

#### Scenario: 团体报名成功
- **WHEN** 三人团体报名
- **THEN** 作品 `TEAM`、`declared_group_size=3`，参赛人 3 条且仅第一位为队长，唯一键 3 条
- **判据**:集成测试查库断言

### Requirement: [FR-006] 我的报名

`GET /api-web/competcategory/productlists` **MUST** 需要登录，返回 `{data: [...], total}`：本账号（按来源库与旧用户编号关联人员）作为参赛人的全部未删除作品，按作品 ID 倒序，
每项含 `productid, id(赛事ID), title, status, legacy_status, firstcatid, secondcatid, regionsid, purl, teachername, created_at, source_database, competition_name, competition_id, teantype(团体 1 / 个人 0), username, phone`（`username`/`phone` 为队长）。
`GET /api-web/competition/signupdetail?productid=` **MUST** 需要登录；作品不属于本账号时 **MUST** 返回 403「无权查看该报名记录」；
否则返回 `{productinfo, region_name, msg, step, shengAward: null, guoAward: null, team}`：`productinfo` 含作品字段与 `zubie, major, purl, purlname, teachername, teantype, competition_name, region_name, firstcatid_name, secondcatid_name`；
`team` 为成员 `[{id, name, idcard, credential_type, phone, school, group, is_leader}]`；`legacy_status` 为 2 时 `msg`「很遗憾，您的作品未能通过初审。」、3 时「恭喜您的作品顺利通过初审，请耐心等待复赛评审！」、其它「您已报名成功，请等待作品初审！」；`step` 为 0–2 时 1，否则 2。

#### Scenario: 列表与详情
- **WHEN** 账号报名成功后请求列表与该作品详情；另一账号请求同一详情
- **THEN** 列表 `total` 为 1 且含该作品；详情 `msg`「您已报名成功，请等待作品初审！」、`step` 1、`team` 1 人；另一账号 403
- **判据**:集成测试断言
