---
status: "active"
---

# system-file-storage Specification

## Purpose
本能力长期负责 system 模块文件的安全存储与访问：根据部署配置选择禁用、本地开发或阿里云 OSS 存储，约束对象命名与删除范围，保护凭据，并为图片资产提供可控的读写和删除能力。

## Requirements

### Requirement: [FR-001] 系统文件存储

存储后端由 `weiran.storage.mode` 选择：`disabled`（默认）时上传 **MUST** 返回统一服务器错误「文件存储未配置」；
`aliyun` 时 **MUST** 以流式方式写入阿里云 OSS（按文件长度传入输入流，不把整个文件读入内存），`url` 为 `weiran.storage.aliyun.public-base-url` 加对象名；
`local` 时写入 `weiran.storage.local.root` 并经 `/system-uploads/**` 提供访问（仅供开发与测试），使用独立前缀标识 system 托管的文件。
`aliyun` 模式缺少 AccessKey ID、AccessKey Secret、Bucket、Endpoint、公网访问前缀任一项时应用 **MUST** 启动失败，异常信息列出缺少的环境变量名，**MUST NOT** 含 Secret 的值。
写入失败时 **MUST** 返回统一服务器错误「图片上传失败，请稍后重试」，日志记对象名与异常类名，**MUST NOT** 记凭据。
存储后端 **MUST** 将对象名限制在媒体库生成的安全路径结构内。OSS 新对象根文件夹由 `weiran.storage.aliyun.folder`（环境变量 `WEIRAN_STORAGE_ALIYUN_FOLDER`）指定，未配置时为 `media`；本地存储仍使用 `media`。文件夹 **MUST** 匹配 `[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}`，显式空值和非法字符 **MUST** 导致启动失败。OSS 直传前缀、策略、票据与后端代传 **MUST** 使用同一配置，保留用户标识、UTC 日期及 UUID 结构。配置变更 **MUST NOT** 重写历史对象名和 URL；已登记的历史安全文件夹对象 **MUST** 可删除，未过期签名票据仍按其原用户、前缀与有效期验收。
存储后端 **MUST** 支持按对象名删除文件；对象名必须匹配图片库生成的对象格式且不得越出本地根目录。删除成功后对应对象不可再通过存储访问；对象不存在时删除可安全重复调用。

#### Scenario: 存储未配置
- **WHEN** `mode=disabled` 时上传
- **THEN** 返回统一服务器错误，提示「文件存储未配置」
- **判据**:应用服务单测断言

#### Scenario: 阿里云 OSS 流式写入
- **WHEN** `weiran.storage.mode=aliyun`，上传 12 字节文件
- **THEN** OSS 客户端收到的调用为「Bucket、对象名、输入流、内容长度 12」，返回地址为 `<公网前缀>/<对象名>`
- **判据**:基础设施单测（假 OSS 客户端）断言参数与返回值

#### Scenario: 阿里云配置不全与写入失败
- **WHEN** `weiran.storage.mode=aliyun` 缺 Bucket；或 OSS 客户端写入时抛出异常
- **THEN** 前者构造时抛异常且信息列出缺失配置项、不含 Secret；后者上传返回统一服务器错误「图片上传失败，请稍后重试」
- **判据**:基础设施单测断言配置异常与存储失败异常；应用服务单测断言存储失败映射为统一错误响应

#### Scenario: 判定地址是否由本系统存储产生
- **WHEN** 公网前缀为 `https://cdn.example.com`，分别判定 `https://cdn.example.com/media/user_files/1/202610/a.zip`、`https://cdn.example.com.evil.com/a.zip`、`https://other.com/a.zip`
- **THEN** 依次为是、否、否
- **判据**:基础设施单测（阿里云与本地两种实现各断言）

#### Scenario: 安全删除对象
- **WHEN** 媒体库删除本系统登记的图片对象，或尝试删除前缀外的对象名
- **THEN** 本系统对象可被删除且重复删除安全；前缀外对象被拒绝，不能删除根目录外文件或其他 OSS 对象
- **判据**:本地与 OSS 基础设施测试分别断言对象删除及越界对象被拒绝

#### Scenario: 默认与定制 OSS 文件夹
- **WHEN** 未配置 folder，或配置 folder=assets 后签发直传授权及执行后端上传
- **THEN** 前者对象前缀为 media/u/...，后者为 assets/u/...；policy 与票据使用一致前缀，本地与批处理路径不变
- **判据**:配置绑定和基础设施单测断言默认值、完整对象名、解码后的 policy 与票据

#### Scenario: 非法 OSS 文件夹
- **WHEN** folder 为显式空值、../assets、a/b、带引号或空格等不满足单级文件夹规则的文本
- **THEN** 应用配置失败，异常不包含凭据，不签发直传授权
- **判据**:参数化单测断言配置失败并覆盖路径穿越和策略注入字符

#### Scenario: 文件夹切换后的历史兼容
- **WHEN** 配置从 media 切换为 assets，再切换为 archive，读取或删除已登记对象，或验收此前仍有效的签名授权
- **THEN** 历史对象保留原 URL，安全结构内的旧对象可删除；原票据继续核对签名、用户、目录和时效；伪造票据和越界对象均拒绝
- **判据**:OSS 基础设施测试以假客户端验证历史删除与旧票据验收，并断言穿越路径和用户错配被拒绝
