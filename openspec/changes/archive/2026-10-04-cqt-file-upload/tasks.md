---
title: "cqt-file-upload 任务"
status: "done"
updated_at: "2026-10-05"
---

# Tasks

## 0. 准备

- [x] 0.1 在 `biz-dependencies.gradle.kts` 登记 `com.aliyun.oss:aliyun-sdk-oss:3.18.5`，并通过 `verifyFrameworkVersions`（cqt-file-storage/FR-003）

## 2. 领域层 `*-domain` / `*-api`(TG-2)

- [x] 2.1 文件规则：扩展名白名单（不区分大小写）与对象命名（cqt-file-storage/FR-001、cqt-file-storage/FR-002）
- [x] 2.2 存储端口 `FileStorage` 与 `FileStorageException`（cqt-file-storage/FR-003）
- [x] 2.3 对外契约：`FileUploadService`、`UploadedFileView`；`CqtErrors` 加存储未配置 / 上传失败（cqt-file-storage/FR-001、cqt-file-storage/FR-003）

## 3. 应用与基础设施层 `*-application` / `*-infrastructure`(TG-3)

- [x] 3.1 上传用例：未配置 503、空文件 / 类型校验、对象命名、存储失败 503、日志（cqt-file-storage/FR-001、cqt-file-storage/FR-002、cqt-file-storage/FR-003）
- [x] 3.2 OSS 存储：流式写入、公网地址、配置不全启动失败、关闭时 shutdown（cqt-file-storage/FR-003）
- [x] 3.3 本地存储与 `/uploads/**` 资源映射（仅 `mode=local`）、路径越界防护（cqt-file-storage/FR-003）
- [x] 3.4 配置：`weiran.cqt.storage.*`、multipart（1GB、延迟解析）、`application-biz.yml` 占位（cqt-file-storage/FR-002、cqt-file-storage/FR-003）

## 4. 适配层 `*-adapter`(TG-4)

- [x] 4.1 `LocalFilesController`：`POST /api-web/local-files/upload`（需登录）（cqt-file-storage/FR-001）
- [x] 4.2 `PortalExceptionAdvice`：超大文件 → 400「文件大小不能超过 1GB」（cqt-file-storage/FR-002）

## 5. 前端 `web`(TG-5)

- [x] 5.1 uniapp `register.vue`：学校注册隐藏两个上传项并提示注册后到「学校认证」上传（cqt-file-storage/FR-001）

## 5. 测试

- [x] 5.2 领域 / 应用单测：白名单、对象名、未配置、空文件、存储失败
- [x] 5.3 基础设施单测：OSS 写入参数（假客户端）、配置不全、本地路径越界
- [x] 5.4 集成测试 `CqtFileUploadIT`、`CqtUploadLimitIT`
- [ ] 5.5 人工：真实 OSS 凭据本地上传，浏览器打开返回地址

## 6. 发布

- [ ] 6.1 阿里云 Bucket（公共读）与 RAM 子账号、部署环境变量、反向代理请求体与超时、临时目录
- [x] 6.2 文档：`AGENTS.biz.md` 部署段；`state/bizs` 记文件存储说明与已知缺口（孤儿文件、旧文件未迁移）

## 7. 上线后

- [ ] 7.1 验收记录写入 `artifacts.md`(只写 verify.md 没有的:人读摘要 / 运行时验证 / 已知缺口)
