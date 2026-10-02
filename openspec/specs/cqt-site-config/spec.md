---
status: "active"
---

# cqt-site-config Specification

## Purpose
本能力长期负责常青藤前台的站点配置：站点文案、联系方式、协议正文、证书可见性开关等配置项在 `cqt_setting` 表中的存储口径，
以及前台通过 `GET /api-web/product/getconfig` 一次取得全部配置时的键名映射与清洗规则，保证 uniapp 各页面读取的键名与取值形状稳定。

## Requirements

### Requirement: [FR-001] 站点配置存储

站点配置 **MUST** 存放在表 `cqt_setting`，其列与原统一库 `cqtxj2026.sc_setting` 一致：
`id`、`ident`（配置项编号）、`name`、`contents`（文本）、`created_at`、`updated_at`、`deleted_at`、`key`。
表结构 **MUST** 只由 Flyway 脚本创建；原库数据 **MUST** 通过独立导入脚本迁入，**MUST NOT** 写进 Flyway 脚本。

#### Scenario: 空库迁移后表结构一致
- **WHEN** 应用在空库上启动完成 Flyway 迁移
- **THEN** 存在表 `cqt_setting`，列名与类型与 `sc_setting` 一致，且表内无数据
- **判据**:集成测试查询 `information_schema.columns` 断言 8 个列名，`SELECT COUNT(*)` 在测试插入前为 0

#### Scenario: 导入脚本从原库迁入
- **WHEN** 在同一 MySQL 实例上同时存在 `cqtxj2026` 与目标库时执行 `scripts/biz/import/cqt_setting.sql`
- **THEN** `cqt_setting` 的行数与 `cqtxj2026.sc_setting` 一致，重复执行不产生重复行
- **判据**:执行后两表 `COUNT(*)` 相等；再执行一次计数不变

### Requirement: [FR-002] 前台站点配置接口

`GET /api-web/product/getconfig` **MUST** 免登录，返回的 `data` **MUST** 恰好包含以下 22 个键，取值来自 `cqt_setting` 中 `ident` 对应行的 `contents`：
`guanyuwomen`→2、`user_agreement`→2、`yinsixieyi`→3、`about_us`→4、`dizhi`→7、`shouji`→8、`weixin`→9、`youxiang`→10、
`gongsijieshao`→15、`hezuohuoban`→16、`dasaijieshao`→17、`mianzexieyi`→18、`shouhoufuwu`→19、`shangwuhezuo`→20、
`gongzuoshijian`→21、`dasaizhangcheng`→22、`gongzhonghao`→23、`shouyeimage`→66、`certificate_visibility`→67、
`sheng_certificate_visibility`→68、`teacher_org_certificate_competition_id`→69、`guo_certificate_visibility`→70。
只读取 `ident` 在 1–100 之间的行。

#### Scenario: 返回全部 22 个键
- **WHEN** 请求 `GET /api-web/product/getconfig`
- **THEN** `data` 的键集合恰为上述 22 个
- **判据**:集成测试断言 `$.data` 的字段名集合与上表相等

#### Scenario: 缺行的配置项为 null
- **WHEN** `cqt_setting` 中不存在 `ident = 9` 的行
- **THEN** `data.weixin` 为 `null`，接口仍返回 `code` 200
- **判据**:集成测试断言 `$.data.weixin` 为 JSON null

### Requirement: [FR-003] 站点配置清洗规则

除 `gongzhonghao` 外，取值为字符串的配置项 **MUST** 去除全部 HTML 标签（形如 `<…>` 的片段）并去掉首尾空白后返回；
`contents` 为 NULL 的配置项 **MUST** 返回 `null`。
`gongzhonghao` **MUST** 返回数组：`contents` 非空时为只含该原值（不去标签）的单元素数组，为空或缺行时为空数组。

#### Scenario: 去除 HTML 标签
- **WHEN** `ident = 7` 的 `contents` 为 `<p>北京市 <b>东城区</b></p> `
- **THEN** `data.dizhi` 为 `北京市 东城区`
- **判据**:单元测试与集成测试均断言该值

#### Scenario: 公众号字段为数组
- **WHEN** `ident = 23` 的 `contents` 为 `/uploads/qr.png`；以及该行不存在时
- **THEN** 前者 `data.gongzhonghao` 为 `["/uploads/qr.png"]`，后者为 `[]`
- **判据**:单元测试断言两种情形的数组内容
