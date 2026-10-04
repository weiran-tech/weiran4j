---
title: "cqt-file-upload 现实校验"
status: "done"
updated_at: "2026-10-05"
---

# Explore

> **L1 · 现实校验**。带着 `interview.md` 去读代码。

## 调研范围

| 模块 | 目录/文件 | 为什么看它 |
|---|---|---|
| 参考实现 | `fastapi_backend/app/routes/local_files.py`、`app/config.py` | 接口口径、白名单、返回字段 |
| `uniapp` | `util/upload.js`、`pages/login/register.vue`、`pages/my/my.vue` | 调用方与需要改的注册页 |
| `weiran-cqt-adapter` | `portal/{PortalExceptionAdvice,AuthController}` | 上传异常的出口、取当前账号 |
| `weiran-app` | `application.yml` | multipart 配置现状 |
| `weiran-framework` | `GlobalExceptionHandler` | 超大文件异常的现有映射 |
| 阿里云 OSS SDK | `com.aliyun.oss:aliyun-sdk-oss:3.18.5` | API 与传递依赖 |

## 现有实现

| 能力 | 位置 | 现状 |
|---|---|---|
| FastAPI 上传 | `local_files.py` | `POST /api/local-files/upload`，字段 `file`；白名单 14 种扩展名；存 `user_files/<账号或 pending>/<uuid><ext>`；返回 `{url,name,path,size}`；不要求登录、每 IP 每分钟 30 次；读取走 `/uploads/<path>` |
| uniapp 上传工具 | `util/upload.js` | `uni.uploadFile` / `fetch` 到 `/api-web/local-files/upload`，带 `Authorization`（有则带），读 `body.data.url`，要求 `code === 200` |
| 调用点 | `register.vue:385-470`（学校营业执照图片、承诺书图片 / PDF）；`my.vue:2347-2871`（作品 zip、批量导入 xlsx、学校认证营业执照 / 承诺书） | 注册页在提交注册**之前**上传（未登录）；注册提交时不校验附件（`register.vue:560-580` 只校验协议、信用代码、验证码、证件号） |
| 学校认证页 | `my.vue:290` 起「学校认证信息」、`my.vue:2750` 调 `updateuserinfo` 带 `zhizhao`/`chengnuoshu` | 登录后可上传并保存材料（本次让学校走这条路） |
| multipart 配置 | 上游 `application.yml` | 未配置 → Spring 默认单文件 1MB、请求 10MB |
| 超大文件异常 | `GlobalExceptionHandler` 继承 `ResponseEntityExceptionHandler` | `MaxUploadSizeExceededException` → 413 → 映射成 `BAD_REQUEST`「参数校验失败」，提示不明确；且默认在 `DispatcherServlet` 解析 multipart 时抛出，此时还没有 handler，`/api-web` 的 advice 接不到 |
| OSS SDK | `aliyun-sdk-oss-3.18.5` | `new OSSClientBuilder().build(endpoint, ak, sk, ClientBuilderConfiguration)`；`putObject(bucket, key, InputStream, ObjectMetadata)`；`shutdown()`。传递依赖：`httpclient 4.5.13`、`jdom2`、`jettison`、`aliyun-java-sdk-core 4.7.8` 等 |

## 可复用点

| 可复用对象 | 位置 | 复用方式 | 需要改造吗 |
|---|---|---|---|
| `/api-web` 底座 | adapter | `@PortalController`（默认需登录）、`PortalAccount.current()` | 否 |
| `PortalExceptionAdvice` | adapter | 加一个对 `MaxUploadSizeExceededException` 的明确提示 | 是（小改） |
| 阿里云配置风格 | `CqtProperties.Aliyun`、`AliyunSmsSender.requireComplete` | 照搬「缺项启动失败、只列变量名」 | — |
| 依赖版本清单 | `biz-dependencies.gradle.kts` | 追加 OSS SDK | 是 |

## 真实约束

| 约束 | 证据位置 | 对设计的影响 |
|---|---|---|
| multipart 默认在分发前解析，异常时无 handler | Spring MVC `DispatcherServlet#checkMultipart` | 开启 `spring.servlet.multipart.resolve-lazily: true`，让超限异常在参数解析时抛出，由 `/api-web` advice 输出 400 |
| 1GB 文件不能进内存 | — | `file-size-threshold` 保持默认（超阈值落临时文件）；用 `MultipartFile#getInputStream` + `ObjectMetadata.setContentLength` 流式 `putObject` |
| 反向代理默认限制请求体（nginx 1MB） | 部署 | 部署文档写明 `client_max_body_size 1g` 与读超时 |
| CP-13 / 依赖方向 | 宪法 | 存储端口在 domain，OSS 与本地实现在 infrastructure |
| OSS SDK 传递依赖可能触发 `verifyFrameworkVersions` | D-013 | 实现时先跑检查；有偏离先查来源再决定白名单 |
| 学校注册页改动 | `register.vue` | 只隐藏 `is_school==1` 的两个上传区块并加提示，不改提交逻辑（提交本就不校验附件） |
| 测试无法连真实 OSS | — | `mode=local` 写临时目录供 IT；OSS 实现用假客户端单测；真实上传人工验收 |

## 影响面

### 普通改动

| 文件/模块 | 动作 |
|---|---|
| `weiran-cqt-domain/file/`：`FileStorage` 端口、对象名与扩展名规则 | 新增 |
| `weiran-cqt-api/file/`：`FileUploadService`、`UploadedFileView`；`CqtErrors` 加存储未配置 / 上传失败 | 新增 / 改造 |
| `weiran-cqt-application/file/`：上传用例 | 新增 |
| `weiran-cqt-infrastructure/file/`：`OssFileStorage`（+ 客户端包装）、`LocalFileStorage`；配置、自动配置、`/uploads/**` 资源映射（仅 local）；`build.gradle.kts` 加 OSS SDK；`application-biz.yml` multipart 与 OSS 占位 | 新增 / 改造 |
| `weiran-cqt-adapter/portal/`：`LocalFilesController`；`PortalExceptionAdvice` 超大文件提示 | 新增 / 改造 |
| `weiran4j/weiran-dependencies/biz-dependencies.gradle.kts` | 改造 |
| `weiran-app/src/test`：`CqtFileUploadIT`、`application-biz-test.yml`（`mode=local`） | 新增 / 改造 |
| `uniapp/pages/login/register.vue` | 改造 |
| `AGENTS.biz.md`、`state/bizs/`（文件存储说明） | 改造 / 新增 |

**不会碰的目录**：任何上游已有文件、`web/`、`weiran-app/src/main/`。

### 共享层命中 ⚠️

<!-- openspec:slot shared-layers -->

#### 桶文件 / 注册表(必然冲突)

| ID | 文件 | 冲突原因 | 是否命中 · 预计改动 |
|---|---|---|---|
| SL-1 | `settings.gradle.kts` | 新增模块要在 `include(...)` 与目录映射块各追加一处,全仓单点 | 未命中 |
| SL-2 | `weiran-dependencies/build.gradle.kts` | BOM 的 `constraints` 块,新增模块要追加五行坐标 | 间接命中：OSS SDK 版本登记在下游清单 `biz-dependencies.gradle.kts`，不改 BOM 本身 |
| SL-3 | `weiran-app/build.gradle.kts` | 新增模块要追加对其 adapter/infrastructure 层的依赖 | 未命中 |
| SL-4 | `web/src/App.tsx` | 前端路由注册,新增页面必须加一行 | 未命中 |
| SL-5 | `web/src/layouts/AdminLayout.tsx` | 前端菜单数组,与 SL-4 配对——只加一个不加另一个是静默的(不报错,只是导航/访问对不上) | 未命中 |

#### 跨模块契约(多层共同消费)

| ID | 文件 | 冲突原因 | 是否命中 · 预计改动 |
|---|---|---|---|
| SL-6 | `weiran-common/.../error/WeiranErrors.java` | 跨模块错误码基座,**刻意冻结**——新增前先确认真的是跨模块概念,不是某个模块自己的错误码 | 未命中：新码在 `CqtErrors` |
| SL-7 | `weiran-common/.../page/{PageQuery,PageResult}.java` | 跨模块分页契约,前端 `web/src/lib/role.ts` 的 TS 接口需要手动同步,无自动机制 | 未命中 |

#### 序号型资源(本仓库暂无)

无 Flyway 脚本（上传不落表，地址由调用方写进各自业务表）。模块内新契约（`FileStorage`、`FileUploadService`）进 Layer 0。

<!-- /openspec:slot shared-layers -->

## 对 interview 的反向修正

| 原结论 | 现实情况 | 修正后 | 是否已同步回 interview.md |
|---|---|---|---|
| AC-3 超 1GB 返回明确提示 | 默认超限异常在分发前抛出，前台 advice 接不到 | 开启 `resolve-lazily`，并在 `PortalExceptionAdvice` 给出「文件大小不能超过 1GB」 | ☑（AC 不变，属实现约束） |

## 风险预警

| 风险 | 触发条件 | 建议应对 |
|---|---|---|
| OSS SDK 传递依赖偏离框架版本 | `verifyFrameworkVersions` 变红 | `dependencyInsight` 查来源；能排除就排除，不能才加白名单并写理由 |
| 大文件上传超时 | 慢网 + 1GB | 部署文档写代理读超时；Tomcat `connection-timeout` 默认 20 秒只管空闲，不限总时长 |
| 临时目录磁盘占满 | 大量大文件并发 | Spring 在请求结束后删除临时文件；部署时临时目录放在大盘 |
| 公共读地址外泄 | 营业执照等资料 | 用户已接受；对象名 UUID 不可猜 |

## Gate

- [x] 共享层命中已完整列出(漏一项 = L5 必然冲突)
- [x] 与 interview 的冲突项已回写 `interview.md`
- [x] 可复用点已确认,避免 subagent 重复造轮子
