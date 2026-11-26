# Code Scanning 处置记录

2026-11-26 检查 `weiran-tech/weiran4j` 的 11 条开放告警。本次不关闭查询规则，也不排除源码目录。

## 代码修复

- **#43 `js/xss-through-dom`**：VideoPreview 的媒体地址复用 HTTP / HTTPS 白名单校验，非法协议显示错误，不创建 video；下载使用同一校验后地址。
- **#28 `js/clear-text-storage-of-sensitive-data`**：浏览器 Mock 口令改为 BCrypt；旧工作缓存迁移保留业务数据，持久化排除明文凭据字段。只改善本机演示存储，不代表前端 Mock 具备服务端认证边界。
- **#30 `js/file-system-race`**：静态资源通过同一文件描述符检查与读取，启用 O_NOFOLLOW，拒绝链接、隐藏文件和非静态资源。
- **#40 / #41 `js/http-to-file-access`**：Release 字节不再写入临时 tar 文件，直接从内存向 tar 传输；恢复前检查版本目录、目录穿越及非常规文件，在私有目录解压，拒绝覆盖历史快照。

## 预期数据流

以下告警应按具体实例审阅，不全局忽略同类规则。

- **#31 / #32 / #33 / #34 `js/file-access-to-http`**：脚本的用途是把构建好的公开静态站点上传到固定的 `https://api.vercel.com`。`dist` 是唯一资源输入，发布器不上传环境变量、服务端启动器、隐藏文件、源码配置或链接目标。JSON 元数据和缺失资源上传均属于明确的发布行为，不是向未知地址泄露文件。
- **#44 `js/file-access-to-http`**：复扫跟踪到状态查询中的公开 teamId，来自 `prototype/hosting.json`；该标识用于向固定 Vercel API 查询刚创建的部署，不是向未知主机发送文件内容。
- **#35 / #36 `js/http-to-file-access`**：脚本向 GitHub 提供的 GITHUB_OUTPUT / GITHUB_STEP_SUMMARY 写部署结果，网络响应不决定文件路径。返回的部署编号与 `*.vercel.app` 主机名经过格式白名单检查，拒绝换行、路径和其他域名，防止结果字段注入。

## 验证

媒体协议回归、Mock 改密及旧缓存迁移、归档穿越及链接拒绝、静态资源白名单、部署地址注入、原型工具测试与构建均纳入本地检查。最终告警状态以本次提交在 GitHub 上重新完成的 CodeQL 分析为准。

规则参考：[上传文件数据](https://codeql.github.com/codeql-query-help/javascript/js-file-access-to-http/)、[网络数据写入文件](https://codeql.github.com/codeql-query-help/javascript/js-http-to-file-access/)、[DOM 文本重解释](https://codeql.github.com/codeql-query-help/javascript/js-xss-through-dom/)。

## GitHub 复扫结果

提交 `080781c` 的 CodeQL 运行 [45823089040](https://github.com/weiran-tech/weiran4j/actions/runs/45823089040) 成功；#28、#30、#40、#41、#43 自动转为 fixed。上述 7 条预期数据流告警已按实例以 false positive 处置，并在 GitHub 保留判断依据；扫描规则保持开启。
