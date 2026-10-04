---
title: "cqt-file-upload 集成与规格一致性"
status: "done"
updated_at: "2026-10-05"
---

# Verify

---

# 一、集成记录(L6)

**并行方式**:单工作区,无并行集成
**执行单元数**:13 个（E01–E13，单执行者串行）

## 输入检查

- [x] 各执行单元的 `notes/*.md` 齐全（合并为 `notes/E-all-实现记录.md`）
- [x] Layer 0 已完成且契约未再变动
- [x] 自测通过

## 重复实现消除

| 重复项 | 出现位置 | 保留 | 删除 | 调用方已改 |
|---|---|---|---|---|
| 去尾斜杠拼地址 | `OssFileStorage`、`LocalFileStorage`、`CqtAdapterAutoConfiguration` 各一处 `replaceAll("/+$", "")` | 保留 | — | ☐ 三处分属两个模块（infrastructure / adapter），各一行，知情接受 |
| 「文件名取最后一段」 | `UploadedFiles.extensionOf`、`FileUploadApplicationService.baseName` | 保留 | — | ☐ 前者取扩展名、后者取展示名，语义不同，各两行 |

## 被牺牲的方案

| 放弃的方案 | 来自 | 放弃理由 |
|---|---|---|
| 本地磁盘 / 前端直传 / 私有 Bucket / 公开上传 | interview | 用户决定（OSS 后端转存、公共读、必须登录） |
| 只做 OSS 实现 | design | 集成测试与无凭据开发需要可写存储，保留 `mode=local` |
| 依赖框架处理器翻译超大文件异常 | explore | 只会给「参数校验失败」，且默认分发前抛出时前台 advice 接不到 |
| 删除注册页里不再引用的上传方法 | notes | 本次只做最小改动（隐藏区块），死代码下次清理，已记入 notes |

## 越界修改汇总

| 文件 | 申报单元 | 性质 | 处置 |
|---|---|---|---|
| 无 | — | — | — |

---

# 二、规格一致性(L8)

## 前置条件:L7 硬闸门

| 检查(commands 的键) | 命令 | 结果 | 证据 |
|---|---|---|---|
| build | `(cd weiran4j && JAVA_HOME=${JAVA_HOME_21:-$(/usr/libexec/java_home -v 21)} ./gradlew assemble --no-daemon) && pnpm --filter @weiran/web build` | ☑ 绿 | `evidence/build.log` |
| test | `(cd weiran4j && JAVA_HOME=${JAVA_HOME_21:-$(/usr/libexec/java_home -v 21)} ./gradlew test --no-daemon) && pnpm --filter @weiran/web test` | ☑ 绿 | `evidence/test.log` |
| lint | `(cd weiran4j && JAVA_HOME=${JAVA_HOME_21:-$(/usr/libexec/java_home -v 21)} ./gradlew check --no-daemon) && pnpm --filter @weiran/web lint` | ☑ 绿 | `evidence/lint.log` |

代码全部改完后运行，退出码均 0；`test` 步骤实际执行了 `:weiran-app:test`。集成测试 52 个（含 `CqtFileUploadIT` 2、`CqtUploadLimitIT` 1）0 失败 0 跳过；
覆盖率聚合与 `verifyFrameworkVersions`（运行时模块 140、框架已管理 90，下游未写白名单）通过；前端 225 个测试通过。另：uniapp `pnpm run build:h5` 构建成功（注册页模板改动）。

## tasks.md 逐条核对

| tasks.md 条目 | 执行单元 | 实现位置 | 一致 |
|---|---|---|---|
| 0.1 | `E01` | `biz-dependencies.gradle.kts` | ☑ |
| 2.1 | `E02` | `domain/file/UploadedFiles.java` | ☑ |
| 2.2 | `E03` | `domain/file/{FileStorage,FileStorageException}.java` | ☑ |
| 2.3 | `E04` | `api/file/*`、`CqtErrors.{STORAGE_NOT_CONFIGURED,UPLOAD_FAILED}` | ☑ |
| 3.1 | `E05` | `application/file/FileUploadApplicationService.java` | ☑ |
| 3.2 | `E06` | `infrastructure/file/{OssFileStorage,OssObjectWriter,SdkOssObjectWriter}.java` | ☑ |
| 3.3 | `E07` | `infrastructure/file/LocalFileStorage.java`、`CqtAdapterAutoConfiguration#cqtLocalUploadsWebMvcConfigurer` | ☑ |
| 3.4 | `E08` | `CqtProperties.{Storage,Oss,Local}`、`application-biz.yml` | ☑ |
| 4.1 | `E09` | `adapter/portal/LocalFilesController.java` | ☑ |
| 4.2 | `E10` | `PortalExceptionAdvice`（`MaxUploadSizeExceededException`） | ☑ |
| 5.1 | `E11` | `uniapp/pages/login/register.vue` | ☑ |
| 5.2 | `E02`/`E05` | `UploadedFilesTest`(2)、`FileUploadApplicationServiceTest`(3) | ☑ |
| 5.3 | `E06`/`E07` | `OssFileStorageTest`(3)、`LocalFileStorageTest`(2) | ☑ |
| 5.4 | `E12` | `CqtFileUploadIT`(2)、`CqtUploadLimitIT`(1) | ☑ |
| 6.2 | `E13` | `AGENTS.biz.md`、`cqt_portal_accounts.md` #08–#10 | ☑ |

### 未实现条目

| 条目 | 原因 | 是否已在 plan.md 声明 |
|---|---|---|
| 5.5 人工真实 OSS 上传 | 需用户凭据 | ☑ |
| 6.1 阿里云与部署配置 | 发布动作 | ☑ |
| 7.1 验收记录 | 上线后 | ☑ |

## design.md 一致性

| design 章节 | 设计要求 | 实现情况 | 一致 |
|---|---|---|---|
| 宪法对照 CP-4 | SDK 版本只在下游清单 | 同 | ☑ |
| 宪法对照 CP-6 | 捕获 SDK 异常一处并写理由 | `OssFileStorage#store` 捕获 `RuntimeException`，`@SuppressWarnings("IllegalCatch")` 带理由 | ☑ |
| 宪法对照 CP-9 | 凭据不进日志与异常 | 配置缺失只列变量名（单测断言不含 Secret）；存储异常只含类名 | ☑ |
| Data Flow 1–5 | 校验 → 命名 → 流式写入 → 映射错误；超限由 advice 输出 | 同；校验顺序为「空 / 类型 → 存储是否配置」（见不一致项 #1） | ☑ |
| 分层与装配 | `mode=oss/local` 条件注册；`/uploads/**` 仅 local；multipart 1GB + 延迟解析 | 同 | ☑ |
| 前端设计 | 注册页隐藏两个区块并提示 | 同 | ☑ |
| Test Plan | 单元 + 两个 IT + 人工 + 全量门禁 | 人工待执行，其余完成 | ☑ |

## specs 验收标准核对

| spec / Scenario | 验收标准 | 验证方式 | 通过 |
|---|---|---|---|
| FR-001 / 登录用户上传成功 | 字段、对象名含账号、按 url 取回一致 | `CqtFileUploadIT.uploadsAndServes` | ☑ |
| FR-001 / 未登录不能上传 | 401 | `CqtFileUploadIT.rejects` | ☑ |
| FR-002 / 缺文件与不支持的类型 | 两个 400 | `CqtFileUploadIT.rejects` + `FileUploadApplicationServiceTest.validates` | ☑ |
| FR-002 / 超过大小上限 | HTTP 200 + 400「文件大小不能超过 1GB」 | `CqtUploadLimitIT.rejectsOversizedFile` | ☑ |
| FR-003 / 存储未配置 | 50322 | `FileUploadApplicationServiceTest.storageErrors` | ☑ |
| FR-003 / OSS 流式写入 | Bucket、对象名、长度 12、地址 | `OssFileStorageTest.storesAndBuildsUrl` | ☑ |
| FR-003 / OSS 配置不全与写入失败 | 变量名、不含 Secret；50323 | `OssFileStorageTest.{validatesConfig,wrapsFailures}` + `FileUploadApplicationServiceTest.storageErrors` | ☑ |

interview 验收标准：AC-1 ☑、AC-2 ☑、AC-3 ☑、AC-4 ☑、AC-5 ☑、AC-6 ☑（`ObjectMetadata.setContentLength` + 流式 `putObject`，代码审查）、AC-7 ☑（模板改动 + H5 构建）、AC-8 ☑、**AC-9 ☐ 待人工**。

## 越界检查

工作区改动全部落在 plan 第 5 节「拥有」范围内：`weiran4j/weiran-cqt/**`、`biz-dependencies.gradle.kts`、`weiran-app/src/test/{java/com/weiran/app/Cqt*,resources/application-biz-test.yml}`、
`uniapp/pages/login/register.vue`、`AGENTS.biz.md`、`openspec/state/bizs/cqt_portal_accounts.md`、本 change 目录。`upstream-boundary.sh` 无拦截。

| 文件 | 归属单元 | 实际改动方 | 是否申报 | 判定 |
|---|---|---|---|---|
| 无差集 | — | — | — | — |

## 不一致项归属判定 ⚠️

| # | 不一致内容 | 判定 | 去向 |
|---|---|---|---|
| 1 | design Data Flow 2 写「无存储实现 → 50322」在前，实现把「空文件 / 类型」校验放在前 | **spec 表述模糊,实现合理** | 用户错误不应被「存储未配置」掩盖；spec 各场景互不依赖顺序，行为均满足 |
| 2 | `LocalFilesController` 无文件字段时用空流调用用例（由用例返回「请选择文件」） | 实现细节 | Controller 不判断业务错误（CP-11 精神），校验集中在用例 |

## 遗留问题

- [x] **AC-9 真实 OSS 上传未验证** → 用户 L9 确认先归档（2026-10-05），延后到部署时验证；已登记 `cqt_portal_accounts.md#11`
- [x] 学校注册后需补交材料 → 已登记 `cqt_portal_accounts.md#08`
- [x] 旧文件未迁移 → 已登记 `cqt_portal_accounts.md#09`
- [x] 孤儿文件不清理 → 已登记 `cqt_portal_accounts.md#10`
- [x] `register.vue` 中不再被引用的上传方法 → 记入 notes，属死代码，不影响行为

## 流程反馈

- 新增 `@TestPropertySource` 的 IT 会多启动一个 Spring 上下文（本 change 新增 1 个，累计 `CqtWebIT` / `CqtSmsLimitIT` / `CqtUploadLimitIT` 3 个），L7 时长随之增长；后续可考虑把配置差异集中到少数上下文。

## 结论

- [x] 集成完成(单执行单元时:越界汇总已写)
- [x] L7 三项全绿
- [x] tasks.md 条目全部覆盖或已声明
- [x] design/specs 一致
- [x] 无未申报越界
- [x] 不一致项已全部归属并处置完毕

**判定**:☑ 通过,进入 L9 人类审阅 diff（**带条件**：AC-9 真实 OSS 上传经用户决定延后到部署时，登记 `cqt_portal_accounts.md#11`）｜ ☐ 打回 L5 ｜ ☐ 打回 L2
