---
title: "OSS 默认文件夹配置设计"
status: "draft"
updated_at: "2026-11-15"
approved_by: "用户"
approved_at: "2026-11-15"
---

# Design

## Context

- 来源：interview.md 与 explore.md。当前 OSS 与本地对象根路径都固定 media。
- 本次只为 OSS 新媒体对象增加文件夹配置，默认行为不变，不迁移历史对象。

## 宪法对照

| 原则 | 判定 | 说明 |
|---|---|---|
| CP-1 | ☑ | 仅基础设施与应用配置变化，domain 不依赖框架 |
| CP-2 | ☑ | 命名与配置仍在 infrastructure，不逆向引用 |
| CP-3 | ☐ | 不修改持久化类型或端口 |
| CP-4 | ☐ | 不增依赖与版本 |
| CP-5 | ☑ | 沿用 build-logic 质量规则 |
| CP-6 | ☑ | 不新增质量豁免 |
| CP-7 | ☐ | 不改表结构和迁移 |
| CP-8 | ☐ | 不改密码和认证令牌 |
| CP-9 | ☑ | 只新增非敏感目录配置，错误消息不含凭据 |
| CP-10 | ☐ | 不改认证失败行为 |
| CP-11 | ☑ | 沿用存储异常与统一响应，不新增 Controller 状态分支 |
| CP-12 | ☑ | 不引入业务依赖或框架反向依赖 |
| CP-13 | ☐ | 不改业务模块与基座交互 |
| CP-14 | ☐ | 无新错误码 |
| CP-15 | ☐ | 无菜单、权限或迁移号段改动 |

## Architecture

- 配置绑定到 SystemStorageProperties.Aliyun；新增 folder 属性，缺省 media。
- OssFileStorage 向公共命名器传入文件夹；本地仍走默认 media 入口。
- 保留既有五参数 Aliyun 构造入口，委托默认 media，避免下游源代码调用失效；Spring 的规范构造入口按既有约定明确绑定。
- 文件夹允许 1～64 位 ASCII 字母数字、连字符、下划线，首位字母或数字；精确规则 `[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}`。不静默纠正空值、斜杠或空格。
- 配置只作用媒体文件；批处理仍使用自己的目录规则。

## Data Flow

1. 启动时绑定 `weiran.storage.aliyun.folder`，环境变量 `WEIRAN_STORAGE_ALIYUN_FOLDER`，缺省 media；OSS 启用时验证有效目录后再创建客户端。
2. OSS 后端代传产生 `<folder>/u/<Hashids>/<UTC日期>/<UUID>.<扩展名>`。
3. 直传 policy、keyPrefix 与票据共用相同完整前缀，前端按返回值上传。
4. 验收保持原签名、用户、前缀、时效、实际大小和文件头检查；结构校验允许安全单级根文件夹，因此旧缓存授权在有效期内仍可登记。
5. 删除仍按数据库已登记对象名执行，允许安全单级根文件夹加既有用户路径结构；旧 media 的匿名与早期历史格式仍保留。不得接受根外任意文件名、路径穿越或额外目录层。

## 跨模块契约变更(DS-1)

- framework 与 system-api 无变更。新增 infrastructure 的 Aliyun 配置字段；保留五参数构造方式。
- 持久化对象名和 URL 不变；不增加 HTTP 字段。

## API Design(DS-2)

- 路由、方法和 DTO 均不变；直传授权现有 keyPrefix 按配置返回。
- 统一响应仍为 `{code, message, data}`，成功 code 为数字 0。
- Controller / DTO 生成的 OpenAPI 无需增加字段。

## Database Design(DS-3)

- 无表、索引或 Flyway 变更；不重写 sys_media.object_name 或 url。

## 权限与已知缺口(DS-4)

- 继续要求登录上传，票据绑定用户；删除仍经现有资源库权限、引用保护与已登记资源记录。
- 不新增菜单、权限码或写接口，沿用既有 @OperationLog。
- 不引入租户、数据范围、幂等协议或工作流。

## 分层与装配(DS-5)

- 复用现有 system 自动配置和 ConfigurationProperties，不增加自动配置类或依赖。
- 配置与路径规则留在 infrastructure；domain 端口签名不变。

## 前端设计(DS-6)

- 无页面、组件、路由或 TS 接口变更。前端继续使用服务端授权的 keyPrefix，不硬编码目录。
- docs 只更新部署说明，无新增交互演示。

## Observability

- 启动失败提示非法配置项名称，不输出 AccessKey 或票据。
- 上传与删除沿用既有错误映射，不增加敏感日志。

## Test Plan

| 覆盖 | 判定 | 对应验收 |
|---|---|---|
| 配置默认值与绑定 | 缺省 media，配置 assets 生效，五参构造仍可用 | AC-1、AC-2 |
| OSS 代传与授权 | 假客户端检查完整对象名、policy 和票据前缀 | AC-1、AC-2 |
| 输入安全 | 空值、斜杠、点段、空格、引号、超长值均拒绝 | AC-3 |
| 历史兼容 | 多次切换后已登记旧对象删除、旧票据验收、用户错配与越界拒绝 | AC-4 |
| 本地与批处理回归 | 默认目录保持原状 | AC-1、AC-2 |
| 配置示例和文档 | EnvExampleTest 与文档核对 | AC-5 |
| 全量门禁 | 使用 openspec/project.json commands；JDK 21 先 spotlessApply 再 check，真实保存证据 | AC-5 |

## Rollout Plan

1. 先保持默认 media 部署，验证现有上传路径不变。
2. 需要独立目录时设置 `WEIRAN_STORAGE_ALIYUN_FOLDER=assets` 并重启，验证直传与后端上传。
3. 不移动旧文件；保留 Bucket 原读权限与公网访问前缀。文档说明修改只影响后续新授权和上传，已签授权在有效期内继续验收。

## Rollback Plan

1. 配置回退：恢复 folder=media；新上传恢复 media，历史目录与 URL 保留。
2. 代码回退锚点：本变更前提交 `d836470`。若已产生自定义目录对象，不能直接回退到只认 media 的旧校验器；先保留兼容读取与删除的实现，或完成历史对象处置后再回退代码。
3. 无数据库迁移回滚；不删除 Bucket 历史目录。

## Open Questions

- 无；用户已回复“执行.”批准本设计。
