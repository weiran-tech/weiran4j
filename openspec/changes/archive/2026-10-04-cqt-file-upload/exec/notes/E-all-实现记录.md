# E01–E13: 实现记录（单执行者串行）

## 完成的 tasks.md 条目

- `0.1`、`2.1`–`2.3`、`3.1`–`3.4`、`4.1`、`4.2`、`5.1`–`5.4`、`6.2`
- 未执行（已在 plan 声明）：`5.5` 人工真实 OSS 上传、`6.1` 阿里云与部署配置、`7.1` 上线后

## 改了什么

| 文件 | 动作 | 说明 |
|---|---|---|
| `weiran4j/weiran-dependencies/biz-dependencies.gradle.kts` | 改造 | 登记 `aliyun-sdk-oss:3.18.5`（E01） |
| `weiran-cqt-domain/.../file/{UploadedFiles,FileStorage,FileStorageException}.java` | 新增 | E02/E03 |
| `weiran-cqt-api/.../file/{FileUploadService,UploadContent,UploadedFileView}.java`；`CqtErrors` +2 | 新增 / 改造 | E04 |
| `weiran-cqt-application/.../file/FileUploadApplicationService.java`；自动配置登记 | 新增 / 改造 | E05 |
| `weiran-cqt-infrastructure/.../file/{OssObjectWriter,SdkOssObjectWriter,OssFileStorage,LocalFileStorage}.java` | 新增 | E06/E07 |
| `CqtProperties`（`Storage`/`Oss`/`Local`）、`CqtInfrastructureAutoConfiguration`、`application-biz.yml`（multipart + 存储占位）、`build.gradle.kts` | 改造 | E08 |
| `weiran-cqt-adapter/.../portal/LocalFilesController.java`；`PortalExceptionAdvice`（超大文件）；`CqtAdapterAutoConfiguration`（Controller 登记、`/uploads/**` 仅 local） | 新增 / 改造 | E09/E10 |
| `uniapp/pages/login/register.vue` | 改造 | 学校注册隐藏两个上传区块，改为一行提示（E11）；`uploadBusinessLicense` 等方法保留未删（模板不再引用，下次清理） |
| 测试：`UploadedFilesTest`(2)、`FileUploadApplicationServiceTest`(3)、`OssFileStorageTest`(3)、`LocalFileStorageTest`(2)、`CqtFileUploadIT`(2)、`CqtUploadLimitIT`(1)；`application-biz-test.yml`（`storage.mode=local`） | 新增 / 改造 | E12 |
| `AGENTS.biz.md`、`openspec/state/bizs/cqt_portal_accounts.md`（#08–#10） | 改造 | E13 |

## 为什么这么做

- **校验先于打开流、先于判断存储是否配置**：空文件 / 类型错误是用户错误，不应被「存储未配置」掩盖；`UploadContent` 延迟打开，大文件校验失败不会读取。
- **OSS 按 `ObjectMetadata.contentLength` 流式 `putObject`**：SDK 不会为求长度把流读进内存；multipart 超过阈值的内容由 Spring 落临时文件。
- **SDK 隔离在包私有接口 `OssObjectWriter`**：存储逻辑用假实现单测；`OssFileStorage` 实现 `DisposableBean`，应用关闭时 `shutdown()` 释放连接池。
- **`resolve-lazily: true` + advice 专门映射 `MaxUploadSizeExceededException`**：默认在分发前解析 multipart，前台 advice 接不到；框架处理器只会给「参数校验失败」。IT 用单独上下文把上限调到 10 字节验证。
- **本地存储根目录默认值放在 `application-biz.yml`（`${java.io.tmpdir}/cqt-uploads`）**：infrastructure 写文件与 adapter 映射 `/uploads/**` 读同一个配置键，不在两处各算一遍默认值。
- **`verifyFrameworkVersions` 通过，无需白名单**：OSS SDK 的 `httpclient 4.5.13` 等传递依赖不在框架管理范围或与框架一致（运行时模块 140 个、框架已管理 90 个）。
- 放弃：前端直传 / 私有 Bucket / 公开上传（均为用户决定）。

## 依赖的契约

- `exec/plan.md` 第 4 节全部契约，无变更。

## 越界申报

| 文件 | 为什么不得不改 | 性质(必要连带/越界扩大) | 是否可能影响其他单元 |
|---|---|---|---|
| 无 | — | — | — |

## 埋的坑 / 遗留

- [ ] 真实 OSS 上传未验证（5.5）
- [ ] 学校注册后需补交材料 → `cqt_portal_accounts.md#08`
- [ ] 旧文件未迁移 → `#09`；孤儿文件不清理 → `#10`
- [ ] `register.vue` 里不再被模板引用的上传方法未删除

## 自测结果

- 命令：各 `weiran-cqt-*` 模块 `check`；`./gradlew :weiran-app:test --tests 'com.weiran.app.Cqt*'`；`:weiran-app:verifyFrameworkVersions --rerun-tasks`；uniapp `pnpm run build:h5`
- 结果：全部通过；`CqtFileUploadIT` 2、`CqtUploadLimitIT` 1，其余 Cqt IT 全绿；uniapp H5 构建 `DONE Build complete.`
