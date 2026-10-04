---
status: "active"
---

# cqt-file-storage Specification

## Purpose
本能力长期负责常青藤前台的文件上传与存储：谁可以上传、允许的文件类型与大小、文件在存储中的命名与归属、存储后端（阿里云 OSS 或开发用本地目录）的选择与配置要求，
以及上传成功后返回给前台的地址与元数据。学校认证材料、作品文件、批量导入表格都经由它上传。

## Requirements

### Requirement: [FR-001] 文件上传接口

`POST /api-web/local-files/upload`（multipart，文件字段 `file`）**MUST** 需要前台登录。
成功时 **MUST** 返回 `data` 为 `{"url":<可公开访问的地址>,"name":<原始文件名>,"path":<对象名>,"size":<字节数>}`。
对象名 **MUST** 为 `<配置前缀>user_files/<账号ID>/<yyyyMM>/<随机UUID><小写扩展名>`。

#### Scenario: 登录用户上传成功
- **WHEN** 已登录账号上传 `作品.zip`（12 字节）
- **THEN** `code` 200；`data.name` 为 `作品.zip`，`data.size` 为 12，`data.path` 含该账号 ID 且以 `.zip` 结尾，`data.url` 以存储的公网前缀开头、以 `data.path` 结尾，且按 `data.url` 可取回同样的内容
- **判据**:集成测试（本地存储）断言字段，并 GET `data.url` 比对内容

#### Scenario: 未登录不能上传
- **WHEN** 不带令牌上传
- **THEN** `code` 401「请求参数缺token」
- **判据**:集成测试断言

### Requirement: [FR-002] 文件校验

请求中没有文件或文件为空时 **MUST** 返回 `code` 400「请选择文件」。
扩展名（不区分大小写）**MUST** 属于：zip、xlsx、xls、pdf、doc、docx、jpg、jpeg、png、gif、mp3、mp4、mov、avi，否则返回 `code` 400「不支持的文件类型」。
单个文件超过 1GB 时 **MUST** 返回 `code` 400「文件大小不能超过 1GB」。HTTP 均为 200。

#### Scenario: 缺文件与不支持的类型
- **WHEN** 已登录账号分别上传空请求与 `virus.exe`
- **THEN** 分别 `code` 400「请选择文件」与「不支持的文件类型」
- **判据**:集成测试断言

#### Scenario: 超过大小上限
- **WHEN** 上传超过配置上限的文件（测试中把上限调小复现）
- **THEN** `code` 400「文件大小不能超过 1GB」，HTTP 200
- **判据**:集成测试（单独上下文，调小 `spring.servlet.multipart.max-file-size`）断言 `code` 与 HTTP 状态；提示语中的「1GB」为固定口径

### Requirement: [FR-003] 存储后端

存储后端由 `weiran.cqt.storage.mode` 选择：`disabled`（默认）时上传 **MUST** 返回 `code` 503「文件存储未配置」；
`oss` 时 **MUST** 以流式方式写入阿里云 OSS（按文件长度传入输入流，不把整个文件读入内存），`url` 为配置的公网访问前缀加对象名；
`local` 时写入配置的本地目录并经 `/uploads/**` 提供访问（仅供开发与测试）。
`oss` 模式缺少 AccessKey ID、AccessKey Secret、Bucket、Endpoint、公网访问前缀任一项时应用 **MUST** 启动失败，异常信息列出缺少的环境变量名，**MUST NOT** 含 Secret 的值。
写入失败时 **MUST** 返回 `code` 503「文件上传失败，请稍后再试」，日志记对象名与异常类名，**MUST NOT** 记凭据。
存储后端 **MUST** 能判定一个地址是否由本系统当前存储产生（`oss`：以公网访问前缀 + `/` 开头；`local`：以访问前缀 + `/` 开头），供报名等功能校验附件来源。

#### Scenario: 存储未配置
- **WHEN** `mode=disabled` 时上传
- **THEN** 抛出错误码 `50322`（前台 503「文件存储未配置」）
- **判据**:应用服务单测断言

#### Scenario: OSS 流式写入
- **WHEN** `mode=oss`，上传 12 字节文件
- **THEN** OSS 客户端收到的调用为「Bucket、对象名、输入流、内容长度 12」，返回地址为 `<公网前缀>/<对象名>`
- **判据**:基础设施单测（假 OSS 客户端）断言参数与返回值

#### Scenario: OSS 配置不全与写入失败
- **WHEN** `mode=oss` 缺 Bucket；或 OSS 客户端写入时抛出异常
- **THEN** 前者构造时抛异常且信息含 `WEIRAN_CQT_OSS_BUCKET`、不含 Secret；后者上传以错误码 `50323`（前台 503「文件上传失败，请稍后再试」）结束
- **判据**:基础设施单测断言配置异常与存储失败异常；应用服务单测断言存储失败映射为 `50323`

#### Scenario: 判定地址是否由本系统存储产生
- **WHEN** 公网前缀为 `https://cdn.example.com`，分别判定 `https://cdn.example.com/cqt/user_files/1/202610/a.zip`、`https://cdn.example.com.evil.com/a.zip`、`https://other.com/a.zip`
- **THEN** 依次为是、否、否
- **判据**:基础设施单测（OSS 与本地两种实现各断言）
