# sys_media 文件资源

> 当前实现事实，以代码与 system Flyway 迁移为准。

## 0. 概要

| 项 | 值 |
|---|---|
| 表 | `sys_media` |
| 模块 | `weiran-system` |
| 管理页面 | `/system/media-library` |
| 管理接口 | `/api-backend/system/media/uploadFile`、`/api-backend/system/media/getUploadSettings`、`/api-backend/system/media/getDirectUploadAuthorization`、`/api-backend/system/media/completeDirectUpload`、`/api-backend/system/mediaLibrary/list`、`/api-backend/system/mediaLibrary/delete/{id}` |
| 权限 | 上传接口要求登录，不设独立上传权限；资源库列表与删除分别要求 `system:media-library:list/delete` |

## 1. 列表

按上传时间与 ID 倒序分页，支持按原始文件名和类型（图片、视频、文档、压缩包）筛选。列表展示 ID、文件、类型、大小、系统配置引用键、上传时间和操作，遵循列表页规范。

## 2. 字段与表单

`id`、`original_name`、`url`、`object_name`、`size`、`status`、`uploaded_by`、`created_at`。只收录经本系统上传并成功登记的文件。`status` 为 `active/deleting`。类型由原始扩展名识别，引用位置由 `sys_media_reference` 索引与各来源检查器合并。

## 3. 动作

支持多文件选择、逐文件上传、图片与 PDF 预览、视频页内播放、其他文件下载、复制 URL、删除。任一已登记或实时检查到的引用都会阻止删除；对象删除在数据库提交后执行，失败可重试。

## 4. 用到的公共组件

Semi UI 表格、列设置、操作列与搜索工具栏、system 文件存储端口。

## 5. 说明与建议

服务端按系统配置 `system.upload.*` 校验：图片格式限 gif/jpg/jpeg/png 多选（默认全选）、图片大小默认 10 MB、可设 1～100 MB；视频允许 mp4/webm/mov，大小默认 100 MB、可设 1～1024 MB；普通文件格式为逗号分隔的受支持扩展名（默认 `pdf,gif`），大小固定 10 MB。配置缺失或非法时回退默认值。图片按图片规则校验，不受普通文件格式项影响。上传入口、Spring multipart 与 Nginx 限制均允许最大 1024 MB。本地和 OSS 存储使用同一对象名约束。浏览器能否解码 MOV 取决于本机支持的编码。

`aliyun` 模式下浏览器获取 15 分钟有效的 OSS 表单授权并按有效期缓存，直传成功后上报对象名、原文件名、大小与授权票据。服务端校验票据所属用户和对象前缀、OSS 对象实际大小及图片/视频文件头，再写入 `sys_media`；业务配置保存时继续由现有引用服务更新 `sys_media_reference`。直传对象名为 `media/UTC年月/授权UUID/文件UUID.扩展名`；原有后端代传与 `local` 模式仍使用 `media/UTC年月/文件UUID.扩展名`。

## 6. 已知问题汇总

- **#03 部分解决 P2 业务模块引用位置尚未接入资源库**
  通用索引与检查器扩展入口已经具备；现有业务模块若尚未在保存事务中调用 `MediaReferenceService.replace` 或注册检查器，其引用仍可能显示「未发现引用」，管理员可误删业务正在使用的文件。各业务模块接入时需逐一补齐。

## 7. changelog

**2026-10-31**
- 移除 `system:media-library:upload` 按钮权限与上传接口的额外权限检查；登录用户可从配置表单、富文本或资源库上传，列表和删除权限保持独立。

**2026-10-30**
- 富文本图片和视频上传期间在编辑位置显示占位提示，上传完成或失败后移除，提示不写入 HTML。
- 阿里云 OSS 模式的浏览器直传采用限时表单授权；成功后由服务端验收并登记资源。
- 视频上传大小配置上限从 100 MB 提高到 1024 MB，默认仍为 100 MB；同步提高 Spring multipart 与 Nginx 请求上限。
- 上传校验改为读取系统上传设置；资源库及通用上传组件获取当前规则，富文本可上传并插入视频。

**2026-10-24**
- 新增 `sys_media_reference` 与多类型检查器组合，配置和头像自动登记；删除前检查所有来源并锁定资源。业务来源按模块逐一接入。

**2026-10-22**
- **#04 ✅ P? 视频预览与文件类型图标**
  资源库和多文件上传支持视频页内播放、PDF 浏览器预览；ZIP、视频、Word、PPT、Excel、PDF 使用对应图标，不可页内预览的文件显示下载操作。多文件拖动时显示插入位置。

- **#02 ✅ P? 文件资源管理**
  图片上传扩为文件上传，图片可预览，其余文件可在浏览器打开或下载；列表显示系统配置键和用户头像引用，并保护引用中的文件不被删除。

**2026-10-17**
- **#01 ✅ P? change `site-media-management` 新增系统图片资产管理**
  图片资产由图片库独立维护，不再与站点内容配置耦合。
