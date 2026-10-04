## MODIFIED Requirements

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
