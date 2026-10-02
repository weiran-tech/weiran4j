---
title: "cqt-web-foundation 集成与规格一致性"
status: "done"
updated_at: "2026-10-02"
---

# Verify

---

# 一、集成记录(L6)

**并行方式**:单工作区,无并行集成
**执行单元数**:19 个（E01–E20，`E19` 只服务未映射条目 `6.1` 的文档部分；单执行者串行完成）

## 输入检查

- [x] 各执行单元的 `notes/*.md` 齐全（单执行者合并为 `notes/E-all-实现记录.md`，按 plan 第 8 节约定）
- [x] Layer 0 已完成且契约未再变动（plan 第 4 节无变更记录）
- [x] 自测通过（各模块 check + `CqtWebIT` 7/7）

## 重复实现消除

| 重复项 | 出现位置 | 保留 | 删除 | 调用方已改 |
|---|---|---|---|---|
| 错误提示语翻译（参数缺失 / 类型不匹配 / 请求体不可读 / 未预期异常） | 框架 `GlobalExceptionHandler` 与本次 `PortalExceptionAdvice` | 框架实现 | 不复制：`PortalExceptionAdvice` 委托框架处理器的公开方法再改写格式 | ☑ |
| Bearer 令牌解析 | 框架 `AuthInterceptor.bearerToken`（private）与 `PortalAuthInterceptor.bearerToken` | 两份都保留 | — | ☐ 框架方法为 private 且属上游文件，下游不能复用；约 12 行，已知接受 |

## 被牺牲的方案

| 放弃的方案 | 来自 | 放弃理由 |
|---|---|---|
| `PortalExceptionAdvice` 继承 `ResponseEntityExceptionHandler` 并复制 `describe()` | notes | 约 60 行重复，会与框架口径漂移；改为委托框架处理器 |
| advice 按包名（`basePackages`）选择 Controller | design 初稿思路 | 测试专用 Controller 不在该包下；改为 `annotations = PortalController.class` |
| 嵌套 `@TestConfiguration` 注册测试 Controller | notes | `@SpringBootTest(classes=…)` 显式指定启动类时嵌套配置不被发现（实测 404）；改为测试类上 `@Import` |
| 测试密钥写在 `application-biz.yml` 的 `on-profile: test` 文档块 | design 退路 | E01 实测 profile 变体 `application-biz-test.yml` 会被加载，测试密钥不必进主 classpath |
| 导入脚本内做 latin1 → utf8mb4 还原 | 实现中发现编码问题后的选项 | 用户决定不转换（生产库是否乱码未确认，误转会弄坏正常数据），登记 `cqt_setting.md#01` |

## 越界修改汇总

| 文件 | 申报单元 | 性质 | 处置 |
|---|---|---|---|
| 无 | — | — | notes 无越界申报 |

---

# 二、规格一致性(L8)

## 前置条件:L7 硬闸门

| 检查(commands 的键) | 命令 | 结果 | 证据 |
|---|---|---|---|
| build | `(cd weiran4j && JAVA_HOME=${JAVA_HOME_21:-$(/usr/libexec/java_home -v 21)} ./gradlew assemble --no-daemon) && pnpm --filter @weiran/web build` | ☑ 绿 | `evidence/build.log` |
| test | `(cd weiran4j && JAVA_HOME=${JAVA_HOME_21:-$(/usr/libexec/java_home -v 21)} ./gradlew test --no-daemon) && pnpm --filter @weiran/web test` | ☑ 绿 | `evidence/test.log` |
| lint | `(cd weiran4j && JAVA_HOME=${JAVA_HOME_21:-$(/usr/libexec/java_home -v 21)} ./gradlew check --no-daemon) && pnpm --filter @weiran/web lint` | ☑ 绿 | `evidence/lint.log` |

三条均为代码全部改完后运行，退出码 0。`weiran-app` 集成测试 39 个（`AuthIT` 9、`UserRoleIT` 10、`PreferencesIT` 7、`CqtWebIT` 7、`PlatformIT` 4、`TreeIT` 2）0 失败 0 跳过；
`:weiran-app:jacocoTestCoverageVerification`（跨模块聚合行覆盖 70%）通过；前端 27 个文件 225 个测试通过。无红灯，无需基线归因。

## tasks.md 逐条核对

| tasks.md 条目 | 执行单元 | 实现位置 | 一致 |
|---|---|---|---|
| 0.1 | `E01` | 结论：profile 变体被加载（notes） | ☑ |
| 2.1 | `E06` | `weiran-cqt-domain/.../setting/SiteConfig.java` | ☑ |
| 2.2 | `E03` | `weiran-cqt-domain/.../setting/SettingRepository.java` | ☑ |
| 2.3 | `E04` | `weiran-cqt-domain/.../portal/PortalTokenCodec.java` | ☑ |
| 2.4 | `E05` | `weiran-cqt-api/.../setting/SiteConfigService.java` | ☑ |
| 3.1 | `E02` | `weiran-cqt-infrastructure/.../db/migration/cqt/V202610022200__cqt_setting.sql` | ☑ |
| 3.2 | `E07` | `weiran-cqt-infrastructure/.../persistence/{MybatisSettingRepository,entity/CqtSettingDO,mapper/CqtSettingMapper}.java` | ☑ |
| 3.3 | `E08` | `weiran-cqt-infrastructure/.../security/JjwtPortalTokenCodec.java` | ☑ |
| 3.4 | `E09` | `weiran-cqt-infrastructure/src/main/resources/application-biz.yml` | ☑ |
| 3.5 | `E10` | `weiran-cqt-application/.../setting/SiteConfigApplicationService.java` | ☑ |
| 3.6 | `E11` | `CqtInfrastructureAutoConfiguration`、`CqtApplicationAutoConfiguration` + 两份 `AutoConfiguration.imports` | ☑ |
| 3.7 | `E12` | `scripts/biz/import/cqt_setting.sql` | ☑ |
| 4.1 | `E13` | `weiran-cqt-adapter/.../portal/{PortalResult,PortalController}.java` | ☑ |
| 4.2 | `E14` | `weiran-cqt-adapter/.../portal/PortalExceptionAdvice.java` | ☑ |
| 4.3 | `E15` | `weiran-cqt-adapter/.../portal/{PortalAuthInterceptor,PortalPublic,PortalAccount}.java` | ☑ |
| 4.4 | `E16` | `weiran-cqt-adapter/.../portal/ProductController.java` | ☑ |
| 4.5 | `E17` | `CqtAdapterAutoConfiguration` + `AutoConfiguration.imports` | ☑ |
| 5.1 | `E06` | `SiteConfigTest`（4 个用例） | ☑ |
| 5.2 | `E08` | `JjwtPortalTokenCodecTest`（5 个用例） | ☑ |
| 5.3 | `E18` | `weiran-app/src/test/java/com/weiran/app/CqtWebIT.java`（7 个用例） | ☑ |
| 5.4 | `E12` | 一次性 MySQL 8.4 容器两遍执行：29/29 行、内容不一致 0（notes） | ☑ |
| 6.2 | `E20` | `AGENTS.biz.md`、`state/bizs/{cqt_setting.md,README.biz.md}`、`scripts/biz/upstream-boundary.sh` | ☑ |

### 未实现条目

| 条目 | 原因 | 是否已在 plan.md 声明 |
|---|---|---|
| 6.1 部署环境配置密钥、切换时执行导入 | 发布动作，合并后执行；步骤已写入 `AGENTS.biz.md` | ☑ |
| 7.1 验收记录写入 `artifacts.md` | 上线后条目 | ☑ |

## design.md 一致性

| design 章节 | 设计要求 | 实现情况 | 一致 |
|---|---|---|---|
| 宪法对照 CP-11 ⚠ | `/api-web` HTTP 恒 200、body code = 错误码/100，只在一处转换 | `PortalExceptionAdvice` 唯一出口；Controller 不手写 code | ☑ |
| 宪法对照 CP-8 ⚠ | C 端令牌暂无吊销，账号 change 补 `ver` | `JjwtPortalTokenCodec` 类注释与 `AGENTS.biz.md` 写明 | ☑ |
| 宪法对照 CP-6 | 唯一豁免 `@SuppressForbidden` 在令牌编解码两个方法 | 同 | ☑ |
| Data Flow 1 | 拦截器：公开接口放行且有效令牌仍写入账号；无令牌 / 无效令牌两种提示语 | `PortalAuthInterceptor` | ☑ |
| Data Flow 3 | advice `annotations = PortalController.class`、`HIGHEST_PRECEDENCE` | 同；另加 `@SkipApiResponse`（见不一致项 #1） | ☑ |
| API Design | `GET /api-web/product/getconfig` 公开；测试专用接口在 `/api-web/__test/**` 只在测试 classpath | 同 | ☑ |
| Database Design | `cqt_setting` 列同 `sc_setting`；读取不过滤 `deleted_at`；导入按主键 `ON DUPLICATE KEY UPDATE` | 同；同一 ident 多行取 `id` 最大（见不一致项 #2） | ☑ |
| 分层与装配 | 三层各自 `@AutoConfiguration` + imports；`weiran.cqt.jwt.{secret,ttl}`；`Clock` 复用框架 bean | 同（框架已提供 `Clock` bean） | ☑ |
| Observability | 未预期异常记 error 不进响应；令牌失败只记 debug 异常类名；缺密钥启动失败提示变量名 | 未预期异常由框架 `handleUnexpected` 记日志；其余同 | ☑ |
| Test Plan | 单元 + 集成 + 导入脚本手工 + 全量门禁 | 同 | ☑ |

## specs 验收标准核对

| spec / Scenario | 验收标准 | 验证方式 | 通过 |
|---|---|---|---|
| cqt-portal-api FR-001 / 公开接口成功返回 | HTTP 200、code 200、message「成功」、data 为对象 | `CqtWebIT.getConfig`（`assertPortalOk`） | ☑ |
| cqt-portal-api FR-002 / 业务异常折成三位码 | 200 + 404 + 「资源不存在」 | `CqtWebIT.errorSemantics` | ☑ |
| cqt-portal-api FR-002 / 参数校验失败 | 200 + 400 + 含参数名 | `CqtWebIT.errorSemantics`（缺失「page: 不能为空」、类型「page: 参数类型不正确」） | ☑ |
| cqt-portal-api FR-002 / 未预期异常不泄露细节 | 200 + 500 + 「服务器内部错误」，不含内部信息 | `CqtWebIT.errorSemantics` | ☑ |
| cqt-portal-api FR-002 / 后台接口错误语义不变 | `/api/auth/me` 无令牌 → 401 + 40100 | `CqtWebIT.adminErrorsUnchanged` + 上游 IT 全绿 | ☑ |
| cqt-portal-api FR-003 / 签发后可解析回账号 ID | 42 → 42 | `JjwtPortalTokenCodecTest.roundTrip` | ☑ |
| cqt-portal-api FR-003 / 过期与错误类型的令牌无效 | 均为空 | `JjwtPortalTokenCodecTest.{rejectsExpired,rejectsWrongType,rejectsForeignOrGarbage}` | ☑ |
| cqt-portal-api FR-003 / 密钥过短时启动失败 | `IllegalStateException` 含 `WEIRAN_CQT_JWT_SECRET` | `JjwtPortalTokenCodecTest.rejectsShortSecret` | ☑ |
| cqt-portal-api FR-004 / 无令牌访问需登录接口 | 200 + 401 + 「请求参数缺token」 | `CqtWebIT.requiresPortalToken` | ☑ |
| cqt-portal-api FR-004 / 无效令牌访问需登录接口 | 200 + 401 + 「登录失效,请重新登录」 | `CqtWebIT.requiresPortalToken`（格式错误令牌）；签名错误 / 过期由单测覆盖解析为空、拦截器对「解析为空」统一处理 | ☑ |
| cqt-portal-api FR-004 / 有效令牌访问需登录接口 | `data == 42` | `CqtWebIT.requiresPortalToken` | ☑ |
| cqt-portal-api FR-004 / 前后台令牌互不通用 | 前台令牌 → `/api/auth/me` 401/40100；后台令牌 → `/api-web` 200/401 | `CqtWebIT.portalAndAdminTokensAreSeparate` | ☑ |
| cqt-site-config FR-001 / 空库迁移后表结构一致 | 8 列名与顺序 | `CqtWebIT.settingTableMatchesLegacyColumns` | ☑ |
| cqt-site-config FR-001 / 导入脚本从原库迁入 | 行数相等、重复执行不变 | 手工：容器两遍执行 29/29（notes） | ☑ |
| cqt-site-config FR-002 / 返回全部 22 个键 | 键集合相等 | `CqtWebIT.getConfig` + `SiteConfigTest.returnsAllKeysWithNullForMissingRows` | ☑ |
| cqt-site-config FR-002 / 缺行的配置项为 null | `weixin` 为 null，code 200 | `CqtWebIT.getConfig` | ☑ |
| cqt-site-config FR-003 / 去除 HTML 标签 | `北京市 东城区` | `SiteConfigTest.stripsHtmlAndSharesIdent` + `CqtWebIT.getConfig` | ☑ |
| cqt-site-config FR-003 / 公众号字段为数组 | `["/uploads/qr.png"]` / `[]` | `SiteConfigTest.wechatOfficialAccountIsArray` + `CqtWebIT.getConfig` | ☑ |

interview 验收标准：AC-1 ☑（getConfig）、AC-2 ☑（缺行 null）、AC-3 ☑、AC-4 ☑、AC-5 ☑（上游 IT 全绿 + adminErrorsUnchanged）、AC-6 ☑、
AC-7 ☑（L7 三绿、`openspec check` 通过、`upstream-boundary.sh` 对本次改动只命中放行名单外 0 个文件）、AC-8 ☑（表结构 IT + 导入脚本手工）。

## 越界检查

`git status` 的文件集全部落在 plan 第 5 节各单元的「拥有」范围内：`weiran4j/weiran-cqt/**`、`weiran-app/src/test/{java/com/weiran/app/CqtWebIT.java,resources/application-biz-test.yml}`、
`scripts/biz/**`、`AGENTS.biz.md`、`openspec/state/bizs/{cqt_setting.md,README.biz.md}`、本 change 目录。未改任何上游已有文件。

| 文件 | 归属单元 | 实际改动方 | 是否申报 | 判定 |
|---|---|---|---|---|
| 无差集 | — | — | — | — |

## 不一致项归属判定 ⚠️

| # | 不一致内容 | 判定 | 去向 |
|---|---|---|---|
| 1 | design 未提到 `PortalExceptionAdvice` 需自标 `@SkipApiResponse`（框架统一包装按 advice 类所在包匹配异常处理方法的返回值，不标会被再包一层 `{code:0}`） | **spec 表述模糊,实现合理** | 实现细节，不改设计意图；记录在 notes 与本节，`AGENTS.biz.md` 已写明「异常由 `PortalExceptionAdvice` 统一输出」 |
| 2 | 同一 ident 多行时取哪行，design / spec 未规定；原实现依赖返回顺序 | **spec 表述模糊,实现合理** | 实现取 `id` 最大，口径写进 `state/bizs/cqt_setting.md` §3 |
| 3 | spec FR-004「无效令牌」场景举例「签名错误或已过期」，集成测试用的是格式错误令牌 | **spec 表述模糊,实现合理** | 三者在拦截器里同一分支（解析为空）；签名错误与过期由单测直接覆盖，不新增 IT |

## 遗留问题

- [x] `cqtxj2026.sql` 导出文件中文双重编码乱码，生产库是否同样未确认；导入脚本不转换（用户决定）→ 已登记 `cqt_setting.md#01`
- [x] C 端令牌暂无吊销机制（CP-8 ⚠）→ 写入 `AGENTS.biz.md`「先读这四条」第 3 条，账号 change 必须补 `ver`
- [x] 请求未匹配任何 Controller 时（`/api-web/不存在`）由框架返回 HTTP 404，uniapp 会弹窗——只在调错路径时出现，知情接受（explore 已记录）
- [x] Bearer 令牌解析在框架与下游各有一份（框架方法 private、属上游文件）→ 知情接受，约 12 行

## 流程反馈

- `explore` 模板的「序号型资源」段仍写「本仓库没有 Flyway」，已过时（上游模板问题，下游不改上游文件；同步时由上游修正）。
- 契约 §2.2「下游扩展入口」缺「下游集成测试放哪」一行：本次用 `weiran-app/src/test` 下的新文件，可反馈给 weiran4j 上游补登记。

## 结论

- [x] 集成完成(单执行单元时:越界汇总已写)
- [x] L7 三项全绿
- [x] tasks.md 条目全部覆盖或已声明
- [x] design/specs 一致
- [x] 无未申报越界
- [x] 不一致项已全部归属并处置完毕

**判定**:☑ 通过,进入 L9 人类审阅 diff ｜ ☐ 打回 L5 ｜ ☐ 打回 L2
