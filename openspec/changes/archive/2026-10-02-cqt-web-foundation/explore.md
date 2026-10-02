---
title: "cqt-web-foundation 现实校验"
status: "done"
updated_at: "2026-10-02"
---

# Explore

> **L1 · 现实校验**。带着 `interview.md` 去读代码。

## 调研范围

| 模块 | 目录/文件 | 为什么看它 |
|---|---|---|
| `weiran-common` | `com/weiran/common/error/*`、`response/ApiResponse` | 错误码契约，`/api-web` 异常映射要复用 |
| `weiran-framework` | `web/{ApiResponseBodyAdvice,GlobalExceptionHandler,SkipApiResponse}`、`auth/{AuthInterceptor,TokenAuthenticator}`、`autoconfigure/WeiranFrameworkAutoConfiguration` | 统一响应、异常、认证的接入点与边界 |
| `weiran-base-*` | `system/infrastructure/security/JwtTokenCodec`、`platform/infrastructure/{autoconfigure,persistence}`（字典） | JWT 与持久化 / 自动配置的现成写法 |
| `weiran-app` | `application.yml`、`src/test/.../IntegrationTestSupport`、`application-test.yml` | 配置导入、集成测试基类、覆盖率聚合 |
| `weiran-cqt-*` | 初始化提交的五层骨架 | 本次落代码的位置 |
| 参考实现 | `常青藤20260929/fastapi_backend/app/{routes/product.py,security.py,responses.py}` | `getconfig` 的字段口径、C 端令牌与 401 语义 |
| `uniapp` | `main.js:107-195`、10 个页面对 `getconfig` 的调用 | 前台真实契约 |

## 现有实现

| 能力 | 位置 | 现状 |
|---|---|---|
| 统一响应包装 | `weiran-framework/.../web/ApiResponseBodyAdvice.java` | 只作用于 `com.weiran` 包；标 `@SkipApiResponse` 的类/方法原样输出（上游 D-012 已落地） |
| 全局异常 | `weiran-framework/.../web/GlobalExceptionHandler.java:43-45` | `@Order(LOWEST_PRECEDENCE)`、不限包、继承 `ResponseEntityExceptionHandler`；HTTP 状态 = `errorCode.httpStatus()`，body `{code:五位码}` |
| 后台认证 | `weiran-framework/.../auth/AuthInterceptor.java`；注册于 `WeiranFrameworkAutoConfiguration.java:115` `addPathPatterns("/api/**")` | 只拦 `/api/**`；令牌校验走**单一** SPI `TokenAuthenticator`，取法 `authenticators.getIfAvailable()` |
| 后台 JWT | `weiran-base-infrastructure/.../security/JwtTokenCodec.java` | jjwt 0.13，HS256，密钥 < 32 字节启动失败；`Date` 边界用 `@SuppressForbidden` 豁免；解析失败只记 debug 不带令牌 |
| 错误码 | `weiran-common/.../error/{ErrorCode,CommonErrors,BizException}.java` | 五位码，前三位 = HTTP 状态；`CommonErrors.UNAUTHORIZED=40100` 等 |
| 持久化写法 | `platform/infrastructure/persistence/{entity/SysDictDO,mapper/SysDictMapper}.java`、`autoconfigure/PlatformInfrastructureAutoConfiguration.java` | `@TableName` + `BaseMapper`；自动配置类 `@MapperScan` + `@Import` 仓储，登记在 `META-INF/spring/…AutoConfiguration.imports` |
| 业务配置入口 | `weiran-app/src/main/resources/application.yml`（`spring.config.import: optional:classpath:application-biz.yml`） | 下游放一份 `application-biz.yml` 即生效 |
| 集成测试 | `weiran-app/src/test/java/com/weiran/app/IntegrationTestSupport.java` | **包级私有**抽象类，Testcontainers MySQL 单例 + `@ActiveProfiles("test")`，所有 IT 共用一个 Spring 上下文 |
| FastAPI `getconfig` | `fastapi_backend/app/routes/product.py:11-53` | 读 `sc_setting` ident 1–100，按 22 键映射；字符串去 HTML 标签；ident 23 包成数组 |
| FastAPI 401 | `fastapi_backend/app/security.py` `auth_required` | 无令牌 → `{code:401,"请求参数缺token"}`；无效 → `{code:401,"登录失效,请重新登录"}`，HTTP 均 200 |
| uniapp 判定 | `uniapp/main.js:150-180` | 非 2xx 一律弹窗；`code==200` 成功；`code==401` 或 message=`请求参数缺token` 视为未登录，且对 `登录失效,请重新登录`/`请求参数缺token` 不弹窗 |

## 可复用点

| 可复用对象 | 位置 | 复用方式 | 需要改造吗 |
|---|---|---|---|
| `BizException` / `ErrorCode` / `CommonErrors` | `weiran-common` | `/api-web` 业务异常直接抛它们，advice 把五位码折成前三位 | 否 |
| `@SkipApiResponse` | `weiran-framework` | 标在 `/api-web` Controller 类上 | 否 |
| `@PublicApi` | `weiran-framework/auth` | **不复用**：它属于后台拦截器语义；C 端另起注解，避免一个注解被两个拦截器解释 | — |
| `JwtTokenCodec` 写法 | `weiran-base-infrastructure` | 照搬结构（最小载荷、密钥长度校验、Clock 注入、`@SuppressForbidden` 边界）；不能直接依赖它（CP-13 只许依赖 `weiran-base-api`） | — |
| 字典的持久化/自动配置结构 | `weiran-base-infrastructure/platform` | 照搬 `@MapperScan` + `AutoConfiguration.imports` | — |
| `IntegrationTestSupport` | `weiran-app/src/test` | 下游 IT 放在同包 `com.weiran.app` 下新文件 `Cqt*IT.java`，继承它 | 否（只新增文件） |

## 真实约束

| 约束 | 证据位置 | 对设计的影响 |
|---|---|---|
| `TokenAuthenticator` 是单例 SPI，`getIfAvailable()` 遇到两个 bean 会抛 `NoUniqueBeanDefinitionException` | `AuthInterceptor.authenticate` | C 端认证**不得**实现 `TokenAuthenticator`，自建拦截器与令牌服务 |
| 框架 `GlobalExceptionHandler` 继承 `ResponseEntityExceptionHandler`，参数校验、类型不匹配、请求体不可读等 Spring MVC 异常都在它的 `handleExceptionInternal` 里 | `GlobalExceptionHandler.java:94-110` | `/api-web` 的 advice 也要覆盖这些异常（同样继承 `ResponseEntityExceptionHandler` 或逐个声明），否则校验失败会漏到框架处理器、返回非 2xx |
| 请求未匹配到任何 Controller（如 `/api-web/不存在`）时没有 handler，`basePackages` 受限的 advice 接不到 | `GlobalExceptionHandler` 类注释 | 此类 404 仍由框架返回 HTTP 404；uniapp 会弹窗——可接受（只有调错路径才会发生），在 design 里写明 |
| 拦截器抛出的异常：拦截器运行在 DispatcherServlet 内且 handler 已确定，受限 advice 能接到 | `AuthInterceptor` 类注释 | C 端拦截器直接抛 `BizException(UNAUTHORIZED)` 即可由 `/api-web` advice 转成 `code:401` |
| CP-13：业务只能依赖 `weiran-base-api` 与 `weiran-framework` | `constitution.md` CP-13 | 不能复用 `JwtTokenCodec`；在 `weiran-cqt-infrastructure` 自己实现 |
| CP-9：密钥不进仓库 | `application.yml` 注释、契约 §2.2 | `application-biz.yml` 写 `secret: ${WEIRAN_CQT_JWT_SECRET:}`；集成测试需要测试密钥 |
| 所有 IT 共用一个 Spring 上下文；C 端令牌服务若在密钥为空时启动失败，**上游的 IT 也会一起失败** | `IntegrationTestSupport` | 必须给 `test` profile 提供 C 端测试密钥。`application-test.yml` 是上游文件不能改 → 新增 `weiran-app/src/test/resources/application-biz-test.yml`（需验证 `spring.config.import` 会加载导入文件的 profile 变体；不行则改为同目录新文件经其它方式加载，见风险） |
| `weiran-app` 的覆盖率只聚合 `weiran-app:test` 的执行数据，门槛行覆盖 70%；各模块 application/infrastructure/adapter 自身门禁关闭 | `weiran-app/build.gradle.kts`、契约 §2.2 末段 | 新代码主要靠 `weiran-app` 下的 `Cqt*IT` 覆盖；domain 层纯逻辑（去 HTML、键映射）写单测 |
| `IntegrationTestSupport` 是包级私有 | 同上 | 下游 IT 必须放在 `com.weiran.app` 包 |
| Forbidden APIs 全局禁 `java.util.Date` | `JwtTokenCodec` 注释 | C 端 JWT 同样在唯一边界方法上 `@SuppressForbidden`，`compileOnly("de.thetaphi:forbiddenapis")` |
| `sc_setting.contents` 是 `text`，ident 23 在 FastAPI 里 `isinstance(value, list)` 永远为假 → 实际行为是「有值包成单元素数组，无值空数组」 | `product.py:47-49` | 按实际行为实现，不发明拆分规则 |
| FastAPI `strip_html(None)` → `""`，但只对 `str` 调用；`None` 原样返回 `null` | `product.py:37-38,50` | 缺行 → `null`；空串 → `""` |
| 映射里 `guanyuwomen` 与 `user_agreement` 都指向 ident 2 | `product.py:12-13` | 照搬，两个键同值 |

## 影响面

### 普通改动

| 文件/模块 | 动作 |
|---|---|
| `weiran-cqt-domain`：站点配置键映射与去 HTML（纯函数）+ `SettingRepository` 端口 | 新增 |
| `weiran-cqt-api`：`SiteConfigService` 接口；C 端当前账号 / 公开注解若需跨层放这里 | 新增 |
| `weiran-cqt-application`：`SiteConfigApplicationService`、自动配置 | 新增 |
| `weiran-cqt-infrastructure`：`CqtSettingDO`/Mapper/仓储、C 端 JWT 编解码、Flyway `V202610022200__cqt_setting.sql`、自动配置 + imports、`application-biz.yml`、`build.gradle.kts` 加 jjwt 依赖 | 新增 / 改造 |
| `weiran-cqt-adapter`：`/api-web` 包络、异常 advice、C 端拦截器与注册、`ProductController#getconfig`、自动配置 + imports | 新增 |
| `weiran-app/src/test/java/com/weiran/app/CqtWebIT.java`、`src/test/resources/application-biz-test.yml` | 新增（上游目录下的**新文件**，不改上游已有文件） |
| `scripts/biz/import/cqt_setting.sql` | 新增 |
| `AGENTS.biz.md`（`/api-web` 约定补充）、`openspec/state/bizs/{cqt_setting.md,README.biz.md}` | 新增 / 改造 |

**不会碰的目录**：`weiran-common/`、`weiran-framework/`、`weiran-base/`、`weiran-dependencies/`、`build-logic/`、`web/`、`uniapp/`、`weiran-app/src/main/`、`weiran-app/build.gradle.kts`、`openspec/rules/`、`openspec/schemas/`、`openspec/guards/`，以及任何上游已有文件。

### 共享层命中 ⚠️

<!-- openspec:slot shared-layers -->

#### 桶文件 / 注册表(必然冲突)

| ID | 文件 | 冲突原因 | 是否命中 · 预计改动 |
|---|---|---|---|
| SL-1 | `settings.gradle.kts` | 新增模块要在 `include(...)` 与目录映射块各追加一处,全仓单点 | 未命中：D-012 后自动发现，`weiran-cqt` 已在初始化提交里被识别 |
| SL-2 | `weiran-dependencies/build.gradle.kts` | BOM 的 `constraints` 块,新增模块要追加五行坐标 | 未命中：BOM 坐标按模块清单自动生成；jjwt 版本已在 BOM |
| SL-3 | `weiran-app/build.gradle.kts` | 新增模块要追加对其 adapter/infrastructure 层的依赖 | 未命中：依赖与覆盖率聚合自动生成 |
| SL-4 | `web/src/App.tsx` | 前端路由注册,新增页面必须加一行 | 未命中：本次无后台页面 |
| SL-5 | `web/src/layouts/AdminLayout.tsx` | 前端菜单数组,与 SL-4 配对——只加一个不加另一个是静默的(不报错,只是导航/访问对不上) | 未命中：本次无菜单 |

#### 跨模块契约(多层共同消费)

| ID | 文件 | 冲突原因 | 是否命中 · 预计改动 |
|---|---|---|---|
| SL-6 | `weiran-common/.../error/WeiranErrors.java` | 跨模块错误码基座,**刻意冻结**——新增前先确认真的是跨模块概念,不是某个模块自己的错误码 | 未命中：只复用 `CommonErrors`，不新增错误码（业务码段 20–39 本次也不用） |
| SL-7 | `weiran-common/.../page/{PageQuery,PageResult}.java` | 跨模块分页契约,前端 `web/src/lib/role.ts` 的 TS 接口需要手动同步,无自动机制 | 未命中：`getconfig` 不分页 |

#### 序号型资源(本仓库暂无)

模板此段已过时：本仓库已使用 Flyway。本次新增 `weiran-cqt-infrastructure/src/main/resources/db/migration/cqt/V202610022200__cqt_setting.sql`，
属于序号型资源；上游已开 `out-of-order: true`，且下游独占 `db/migration/cqt/` 目录，单 change 串行，无撞号风险。归入 Layer 0（表结构先于仓储实现）。

<!-- /openspec:slot shared-layers -->

## 对 interview 的反向修正

| 原结论 | 现实情况 | 修正后 | 是否已同步回 interview.md |
|---|---|---|---|
| 硬约束「集成测试放在下游自有位置」 | 覆盖率只聚合 `weiran-app:test`，且 `IntegrationTestSupport` 包级私有；契约 §2.2 没有列出下游测试位置 | 下游 IT 放 `weiran-app/src/test/java/com/weiran/app/Cqt*IT.java`、测试配置放 `weiran-app/src/test/resources/application-biz-test.yml`——都是**新文件**，不改上游已有文件，`upstream-boundary.sh` 不拦；同时把「§2.2 缺下游测试入口」登记为上游待补 | ☑ |
| 未定：C 端令牌与后台令牌如何互斥（AC-6） | 两边密钥不同时天然互斥，但配置成同一密钥就会串用 | C 端令牌加载荷 `typ=cqt-web`，解析时强制校验；后台令牌没有该声明 → 拒绝；C 端令牌缺 `username`/`ver` → 后台拒绝 | ☑ |

## 风险预警

| 风险 | 触发条件 | 建议应对 |
|---|---|---|
| `application-biz-test.yml` 不被加载（`spring.config.import` 对导入文件的 profile 变体支持与否未实测） | 测试启动时 C 端密钥为空 → 所有 IT 失败 | L5 第一步先验证；不支持时改为在 `application-biz.yml` 里用 `spring.config.activate.on-profile: test` 文档块写测试密钥（测试专用、无生产价值的固定串），并在 design 里记取舍 |
| 下游异常 advice 与框架 advice 的优先级 | `@Order` 未设或低于框架 | 显式 `@Order(Ordered.HIGHEST_PRECEDENCE)` + `basePackages = "com.weiran.cqt.adapter.web.portal"`，IT 断言 HTTP 200 |
| 覆盖率聚合跌破 70% | 新增代码未被 IT 覆盖 | IT 覆盖：公开接口、需登录接口三种令牌状态、业务异常、未预期异常、参数校验异常 |
| 上游以后新增同名 `Cqt*IT.java` / `application-biz-test.yml` | 极低（上游不会用 `Cqt`/`biz` 命名） | 命名前缀即防线；同步时若冲突手工合并 |

## Gate

- [x] 共享层命中已完整列出(漏一项 = L5 必然冲突)
- [x] 与 interview 的冲突项已回写 `interview.md`
- [x] 可复用点已确认,避免 subagent 重复造轮子
