---
title: "cqt-web-foundation：uniapp 前台接口 /api-web 底座 + 站点配置接口"
status: "done"
updated_at: "2026-10-02"
---

# Interview

> **L0 · 消歧**。deep-interview 的落盘产物,是 `explore.md` 和 `proposal.md` 的唯一输入。

## 一句话需求

> 用户原话,不要改写。

- 使用 duoli-weiran4j 的框架, 重新搭建 常青藤20260929 的后台, 前台使用 常青藤20260929 的 uni 项目
- （本 change 为其第一个切片，用户选择「提交初始化并做第一个切片」：/api-web 的公共部分（{code:200} 包络、异常处理、C 端 JWT）+ getconfig 接口）

## 澄清记录

| # | 提问 | 回答 | 由此确定的决策 |
|---|---|---|---|
| 1 | weiran4j 底层变更如何同步 | 先出方案；用户确认上游可改 | mono4j 以 git fork 跟随 weiran4j，只在契约 §2.2 下游扩展入口落改动（D-012，已在上游落地） |
| 2 | uniapp 接口路径 | 「可以改动请求地址, api-web 这个地址把」 | uniapp 接口统一挂 `/api-web/**`；uniapp 侧已在 `main.js` 统一改写 `/api/` → `/api-web/` |
| 3 | cqtxj2026 的表是否加 `cqt_` 前缀（CP-15） | 「加上前缀」 | 业务表一律 `cqt_` 前缀；`sc_setting` → `cqt_setting` |
| 4 | 旧库数据怎么进新表 | Flyway 只建表，数据另走导入脚本 | `db/migration/cqt/` 只放 DDL；数据用 `scripts/biz/import/*.sql`（`INSERT INTO cqt_x SELECT … FROM cqtxj2026.x`），切换时执行一次。成为后续所有表的惯例 |
| 5 | 表结构保持原样还是规范化 | 只改表名，列保持原样 | `cqt_setting` 列与 `sc_setting` 完全一致（id/ident/name/contents/created_at/updated_at/deleted_at/key），整理留给以后的 change |
| 6 | C 端 JWT 是否兼容 FastAPI 旧令牌 | 不兼容，切换后重新登录 | 新密钥走环境变量（`WEIRAN_CQT_*`），HS256，`sub` = 账号 id；本次只做签发/校验服务与拦截器，登录接口放账号 change |

## 边界

### 要做

- `/api-web` 响应包络 `{code, message, data}`（成功 `code=200`、`message="成功"`），Controller 标 `@SkipApiResponse`
- `/api-web` 专属异常处理：只作用于 `/api-web` 的 Controller 包，优先级高于框架 `GlobalExceptionHandler`；HTTP 恒 200，body `code` = 错误码前三位（如 `40100` → `401`），`message` 透传
- C 端 JWT：令牌签发 / 校验服务（HS256，密钥与有效期来自配置），`/api-web/**` 拦截器；默认需要登录，标公开注解的接口免登录但有令牌时仍解析当前账号；未登录 / 令牌无效 → `code:401`
- `GET /api-web/product/getconfig`（公开）：读 `cqt_setting`，按 FastAPI `CONFIG_IDENT_MAP` 的 22 个键返回，字符串值去 HTML 标签，`gongzhonghao` 返回数组
- Flyway：`V…__cqt_setting.sql` 建 `cqt_setting`（列同 `sc_setting`）
- 导入脚本 `scripts/biz/import/cqt_setting.sql`（从 `cqtxj2026.sc_setting` 导入）
- `application-biz.yml`（C 端 JWT 有效期等非密钥默认值）
- 契约：在 `AGENTS.biz.md` 或下游契约文档登记 `/api-web` 约定与本接口；`state/bizs/cqt_setting.md` + `README.biz.md` 索引

### 明确不做

- 登录 / 注册 / 短信 / 自动登录等账号接口（`/api/auth/*` 那一组）——放账号 change
- `getconfig` 以外的任何业务接口（新闻列表、赛事、报名、成绩…）
- `cqt_setting` 的后台管理页面（`web/`）与 `/api/cqt/**` 后台接口
- `X-CQTXJ-Database` 请求头（按年份切 2026/2027 库）的处理——服务端忽略它
- 兼容 FastAPI 旧 JWT（旧密钥、`source`/`database`/`actor` claims）
- 限流（FastAPI 的 `rate_limit`）
- uniapp 里 Dcat 时代的旧上传接口 `upload/image`、`Upload/file`
- 修改任何上游（weiran4j）文件

### 本次不决定(留给后续 change)

- C 端账号表结构（来自哪张旧表、`sub` 对应的账号主键）——账号 change 决定；本次拦截器只把 `sub` 解析成 long 账号 id
- 文件上传 `/api-web/local-files/upload` 与静态资源 `/uploads` 的存储方案
- `cqt_setting` 的列整理（`ident` 与 `key` 的关系、软删除列是否保留）

## 验收标准

- [ ] AC-1 `GET /api-web/product/getconfig` 不带令牌时 HTTP 200，body `code=200`，`data` 恰好含 FastAPI `CONFIG_IDENT_MAP` 的 22 个键；有 HTML 的字符串值已去标签；`gongzhonghao` 为数组（有值时 1 个元素，无值时空数组）
- [ ] AC-2 `cqt_setting` 中某 ident 缺行时，对应键值为 `null`，接口不报错
- [ ] AC-3 标为需要登录的 `/api-web` 接口：无 `Authorization` 头 → HTTP 200 + `code=401`；令牌签名错误或已过期 → HTTP 200 + `code=401`；有效令牌 → 正常返回且能读到账号 id
- [ ] AC-4 `/api-web` Controller 抛出 `BizException`（如 `CommonErrors.NOT_FOUND`）→ HTTP 200，body `code` 为错误码前三位、`message` 为异常提示；未预期异常 → HTTP 200 + `code=500`
- [ ] AC-5 框架后台接口不受影响：`/api/**` 仍返回 `{code:0}` 包络、错误仍按原 HTTP 状态返回（现有集成测试全绿）
- [ ] AC-6 C 端令牌不能用于后台 `/api/**`（返回 401），后台令牌不能用于 `/api-web/**`（`code=401`）
- [ ] AC-7 `./gradlew check` 全绿（含覆盖率聚合门槛），`node openspec/check.mjs` 通过，`scripts/biz/upstream-boundary.sh` 对本次改动无拦截
- [ ] AC-8 Flyway 在空库上建出 `cqt_setting`，列与 `cqtxj2026.sc_setting` 一致；导入脚本在两库同实例时可执行

## 关键取舍

| 取舍点 | 选择 | 放弃的方案 | 理由 |
|---|---|---|---|
| 数据迁移 | Flyway 只 DDL，数据走导入脚本 | 数据写进 Flyway | 生产内容不应固化进不可修改的迁移；大表无法这样做 |
| 表结构 | 只改表名 | 迁入时规范化 | 导入简单，可与 FastAPI 实现逐表对照 |
| C 端 JWT | 新密钥、不兼容旧令牌 | 兼容旧令牌 | 切换成本只是用户重新登录一次，换来不继承旧 claims 设计 |
| 错误码映射 | body `code` = 五位错误码前三位 | 保留五位码 | uniapp 按 200/401 判断，前三位即 HTTP 语义，与 FastAPI 的 400/401/404 一致 |

## 未决歧义

- 无

## 对下游的硬约束

- 不修改任何上游文件（`scripts/biz/upstream-boundary.sh` 会拦）
- uniapp 的 HTTP 状态必须恒为 2xx（非 2xx 一律弹窗），未登录必须是 body `code:401`
- 密钥不进 `application-biz.yml`，走环境变量（CP-9）
- 新增代码计入 `weiran-app` 覆盖率聚合（行覆盖 70%）。集成测试放 `weiran-app/src/test/java/com/weiran/app/Cqt*IT.java`、
  测试配置放 `weiran-app/src/test/resources/application-biz-test.yml`——上游目录下的**新文件**，不改上游已有文件（explore 反向修正）
- C 端令牌载荷带 `typ=cqt-web` 并在解析时强制校验，保证与后台令牌互斥（explore 反向修正，服务 AC-6）

## Gate

- [x] 「未决歧义」已清零
- [x] 验收标准均可判定真假
- [x] 「明确不做」已列出且足够具体
