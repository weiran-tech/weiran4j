# E01–E20: 实现记录（单执行者串行）

## 完成的 tasks.md 条目

- `0.1` `2.1`–`2.4` `3.1`–`3.7` `4.1`–`4.5` `5.1`–`5.4` `6.2`
- 未完成：`6.1`（部署动作，合并后在部署环境执行）、`7.1`（上线后）

## 改了什么

| 文件 | 动作 | 说明 |
|---|---|---|
| `weiran-cqt-domain/.../setting/{SettingRepository,SiteConfig}.java`、`.../portal/PortalTokenCodec.java` | 新增 | 端口与站点配置组装规则（E03/E04/E06） |
| `weiran-cqt-api/.../setting/SiteConfigService.java` | 新增 | E05 |
| `weiran-cqt-application/.../setting/SiteConfigApplicationService.java`、`autoconfigure/CqtApplicationAutoConfiguration.java` + imports | 新增 | E10/E11 |
| `weiran-cqt-infrastructure/.../persistence/**`、`security/JjwtPortalTokenCodec.java`、`autoconfigure/{CqtInfrastructureAutoConfiguration,CqtJwtProperties}.java` + imports | 新增 | E07/E08/E11 |
| `weiran-cqt-infrastructure/build.gradle.kts` | 改造 | 加 jjwt-api / impl / jackson 与 `compileOnly forbiddenapis`（同基座写法） |
| `weiran-cqt-infrastructure/src/main/resources/{application-biz.yml, db/migration/cqt/V202610022200__cqt_setting.sql}` | 新增 | E09/E02 |
| `weiran-cqt-adapter/.../portal/{PortalController,PortalPublic,PortalResult,PortalAccount,PortalAuthInterceptor,PortalExceptionAdvice,ProductController}.java`、`autoconfigure/CqtAdapterAutoConfiguration.java` + imports | 新增 | E13–E17 |
| `weiran-app/src/test/java/com/weiran/app/CqtWebIT.java`、`weiran-app/src/test/resources/application-biz-test.yml` | 新增 | E18（上游目录下的新文件） |
| `scripts/biz/import/cqt_setting.sql` | 新增 | E12 |
| `AGENTS.biz.md`、`openspec/state/bizs/{cqt_setting.md,README.biz.md}`、`scripts/biz/upstream-boundary.sh` | 新增 / 改造 | E19/E20 |
| 各新包 `package-info.java` | 新增 | `@NullMarked`，与基座一致 |

## 为什么这么做

- **E01 结论**：`application-biz-test.yml` 作为 `spring.config.import: optional:classpath:application-biz.yml` 的 `test` profile 变体**会被加载**——
  `CqtWebIT` 启动成功且 `JjwtPortalTokenCodec` 拿到了测试密钥（不足 32 字节时上下文会启动失败）。未启用 design 里的 `on-profile` 退路。
- **异常出口委托框架处理器**：`PortalExceptionAdvice` 不复制 `GlobalExceptionHandler` 的提示语逻辑，而是调用其公开方法
  （`handleBiz` / `handleConstraintViolation` / `handleDuplicateKey` / `handleException` / `handleUnexpected`）拿到 `ApiResponse`，
  再改写成 `{code: code/100, message}` + HTTP 200。好处：参数缺失、类型不匹配、请求体不可读等提示语与后台完全一致，框架以后改口径自动跟随。
  放弃：继承 `ResponseEntityExceptionHandler` 并复制 `describe()`——约 60 行重复代码，会与框架漂移。
- **advice 选择器用注解而非包名**：`@RestControllerAdvice(annotations = PortalController.class)`，测试专用 Controller 放在任何包都能被覆盖到。
- **`PortalExceptionAdvice` 自身标 `@SkipApiResponse`**：异常处理方法的返回值同样经过框架 `ApiResponseBodyAdvice`（按 advice 类所在包 `com.weiran` 匹配），
  不标会被再包一层 `{code:0}`。这一点 design 没写到，是实现时发现的必要细节。
- **测试 Controller 用 `@Import` 注册**：`IntegrationTestSupport` 的 `@SpringBootTest(classes = WeiranApplication.class)` 显式指定启动类，
  嵌套 `@TestConfiguration` 不会被发现（第一次跑 4 个用例 404，改为测试类上 `@Import` 后通过）。代价：`CqtWebIT` 使用独立的 Spring 上下文（多启动一次，约数秒）。
- **仓储同一 ident 多行取 id 最大**：原 FastAPI 用字典覆盖，结果依赖数据库返回顺序；这里显式 `ORDER BY id`，口径写进 `cqt_setting.md`。

## 依赖的契约

- `exec/plan.md` 第 4 节全部契约，签名未变更。

## 越界申报

| 文件 | 为什么不得不改 | 性质(必要连带/越界扩大) | 是否可能影响其他单元 |
|---|---|---|---|
| 无 | — | — | — |

## 埋的坑 / 遗留

- [ ] `cqt_setting.md#01`：`cqtxj2026.sql` 导出文件里中文为双重编码乱码（`news` 等表同样），生产库是否同样乱码未确认；导入脚本按用户决定不做转换。已登记。
- [ ] 前台令牌无吊销机制（design 宪法对照 CP-8 ⚠），账号 change 必须补 `ver`。已写进 `AGENTS.biz.md`。
- [ ] 请求未匹配任何 Controller（如 `/api-web/不存在`）时没有 handler，仍由框架返回 HTTP 404；uniapp 会弹窗——只有调错路径才会发生（explore 已记录）。

## 自测结果

- 命令：`./gradlew :weiran-cqt-domain:check :weiran-cqt-api:check :weiran-cqt-infrastructure:check :weiran-cqt-application:check :weiran-cqt-adapter:check`；`./gradlew :weiran-app:test --tests com.weiran.app.CqtWebIT`
- 结果：全部通过；`CqtWebIT` 7/7（0 跳过）
- 导入脚本（E12）：一次性 MySQL 8.4 容器，`cqtxj2026.sc_setting` 取自 `cqtxj2026.sql` 的该表段落（29 行），目标库执行 Flyway 脚本建表后连续执行两遍导入：
  两次都是源 29 行 / 目标 29 行 / `contents` 不一致 0 行（`<=>` 比较）。同时发现上面的编码问题。
