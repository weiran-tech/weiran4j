---
title: "cqt-web-foundation 任务"
status: "done"
updated_at: "2026-10-02"
---

# Tasks

## 0. 准备

- [x] 0.1 验证 `spring.config.import` 导入的 `application-biz.yml` 会加载其 `test` profile 变体；不加载则改用 `on-profile: test` 文档块，结论记入 verify（cqt-portal-api/FR-003）

## 2. 领域层 `*-domain` / `*-api`(TG-2)

- [x] 2.1 站点配置领域规则：22 键 → ident 映射、字符串去 HTML 标签与首尾空白、NULL 原样、`gongzhonghao` 单元素 / 空数组（cqt-site-config/FR-002、cqt-site-config/FR-003）
- [x] 2.2 站点配置仓储端口：按 ident 区间取 `ident → contents`（cqt-site-config/FR-002）
- [x] 2.3 前台令牌端口：签发（账号 ID → 令牌）与解析（令牌 → 可选账号 ID）（cqt-portal-api/FR-003）
- [x] 2.4 对外契约：站点配置查询服务接口（cqt-site-config/FR-002）

## 3. 应用与基础设施层 `*-application` / `*-infrastructure`(TG-3)

- [x] 3.1 Flyway 脚本 `db/migration/cqt/V202610022200__cqt_setting.sql` 建 `cqt_setting`，列与 `sc_setting` 一致（cqt-site-config/FR-001）
- [x] 3.2 `cqt_setting` 的持久化映射与仓储实现，只读 ident 1–100（cqt-site-config/FR-001、cqt-site-config/FR-002）
- [x] 3.3 JJWT 前台令牌编解码：HS256、`typ=cqt-web`、密钥 ≥ 32 字节否则启动失败并提示 `WEIRAN_CQT_JWT_SECRET`、可注入时钟、失败日志不含令牌（cqt-portal-api/FR-003）
- [x] 3.4 `application-biz.yml`：`weiran.cqt.jwt.secret` / `ttl`（默认 7 天）走环境变量（cqt-portal-api/FR-003）
- [x] 3.5 站点配置应用服务（cqt-site-config/FR-002）
- [x] 3.6 infrastructure / application 自动配置与 imports 登记（cqt-site-config/FR-002、cqt-portal-api/FR-003）
- [x] 3.7 导入脚本 `scripts/biz/import/cqt_setting.sql`：从 `cqtxj2026.sc_setting` 导入，可重复执行（cqt-site-config/FR-001）

## 4. 适配层 `*-adapter`(TG-4)

- [x] 4.1 前台响应包络与 `@PortalController`（含 `@SkipApiResponse`）（cqt-portal-api/FR-001）
- [x] 4.2 前台异常处理：HTTP 200、code = 错误码前三位、请求错误 400、未预期 500 不泄露细节（cqt-portal-api/FR-002）
- [x] 4.3 前台登录拦截器 `/api-web/**`、`@PortalPublic`、当前账号上下文与两种 401 提示语（cqt-portal-api/FR-004）
- [x] 4.4 `GET /api-web/product/getconfig`（公开）（cqt-site-config/FR-002）
- [x] 4.5 adapter 自动配置与 imports 登记（cqt-portal-api/FR-001、cqt-portal-api/FR-004）

## 5. 测试

- [x] 5.1 领域单测：键映射、缺行 null、去标签、公众号数组
- [x] 5.2 令牌单测：签发解析、过期、错误 typ、短密钥
- [x] 5.3 集成测试 `CqtWebIT`：getconfig 全键 / 取值 / 缺行 / 表结构；三种令牌状态；公开接口带令牌；业务 / 校验 / 未预期异常；前后台令牌互斥；后台错误语义不变
- [x] 5.4 导入脚本在本地两库同实例执行两遍，行数一致

## 6. 发布

- [ ] 6.1 配置与环境变量：部署环境新增 `WEIRAN_CQT_JWT_SECRET`；切换时执行导入脚本
- [x] 6.2 下游文档：`AGENTS.biz.md` 补 `/api-web` 约定（`@PortalController` / `@PortalPublic`、CP-11 偏离说明）；`state/bizs/cqt_setting.md` 与 `README.biz.md` 索引；`upstream-boundary.sh` 放行生成文件 `openspec/specs/README.md`

## 7. 上线后

- [ ] 7.1 验收记录写入 `artifacts.md`(只写 verify.md 没有的:人读摘要 / 运行时验证 / 已知缺口)
