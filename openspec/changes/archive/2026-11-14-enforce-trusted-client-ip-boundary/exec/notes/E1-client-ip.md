# E1：可信客户端 IP

## 完成的 tasks.md 条目

1.1、1.2、2.1、2.2、3.1、3.2、3.3、3.4、4.1 全部完成。

## 改了什么

| 文件 | 动作 | 说明 |
|---|---|---|
| framework/web/{IpAddress,TrustedProxyPolicy,TrustedProxyProperties,ClientIpFilter,ClientIpResolver} | 新增/改造 | 字面量规范化、CIDR、有界可信链和请求内缓存 |
| framework/autoconfigure/WeiranFrameworkAutoConfiguration | 改造 | 属性/过滤器装配，拒绝缺失或非 none 的标准转发策略及 ForwardedHeaderFilter（含注册包装） |
| framework/web/*Test | 新增/改造 | 替换旧无条件信任断言，验证边界/配置冲突 |
| app/application.yml、.env.example | 改造 | 空列表默认与明确 none |
| app/ClientIpIT、UntrustedClientIpIT、ClientIpTestSupport | 新增 | 真实 HTTP 日志、可信短信上下文和伪造头限流回归 |
| manage/nginx.conf | 改造 | 边缘覆盖 XFF/X-Real-IP，清除 Forwarded |
| docs/trusted-proxies.md 与 deployment/environment/contracts、后端两份文档 | 新增/同步 | 三类部署配置与输入结果示例，替换旧风险描述 |

## 为什么这么做

- 先确认 socket peer，再解释可信代理声明；私网不自动可信。
- 保留静态 resolve 签名，让日志和 ClientContext 的既有消费者自然复用同一结果；无过滤器时只取直接对端。
- 放弃每个 Controller 单独注入/解析和全局静态可变配置，避免消费者漂移及跨上下文状态。
- IPv4 先严格四段校验；IPv6 只允许字面量字符和严格 IPv4 尾部，然后交给 JDK 解析，不允许 DNS。IPv4-mapped 统一成 IPv4。
- 新增测试曾发现 CIDR 掩码零位/符号位处理问题，已修复；新增 IT 的错误码与手机号脱敏断言亦按现有业务契约修正。未改变现有限流阈值或脱敏实现。

## 依赖的契约

exec/plan.md 的 C1/C2/C3 已冻结。ClientContext 与 resolve 签名、数字响应码、数据库均保持不变。

## 越界申报

无新增越界修改。以下为开工前已有改动，不属于本次实现：docs/.vitepress/config.mts、openspec/design/README.md、openspec/state/bizs/sys_task.md、V202611111900__system_batch_owner_column_compat.sql；部署文档中对应批处理兼容说明仍保留。artifact.md 原有审计新增 #25/#26 保留，本次只认领/关闭 #03。

## 埋的坑 / 遗留

- 未配代理时只会得到代理 IP，这是安全默认值，发布前须配置实际范围。
- 不识别任意第三方 remoteAddr 包装器或用户自定义 RemoteIpValve；部署契约禁止它们。标准 Boot 转发策略与 ForwardedHeaderFilter 已启动拦截。
- 短信/MFA 的多实例内存状态问题仍见 artifact.md#25，与 IP 来源修复独立。
- Nginx 验证使用本机已有 nginx:stable-alpine，实际为 1.30.6；验证脚本未下载或部署生产镜像。

## 自测结果

- 框架 :weiran-framework:check 通过，包含 86 个用例和静态/覆盖率检查。
- 真实 HTTP 定向 5 个用例通过，见 evidence/http.log。
- Docker 隔离网络 Nginx 配置、边缘伪造、多层可信、非可信上游三类实测通过，见 evidence/nginx.log；临时容器/网络已自动清理。
- docs 构建通过，见 evidence/docs.log。
- 全量 build/test/lint 全部退出 0，见 evidence/{build,test,lint}.log；前端 52 文件/428 测试通过；应用 78 测试无失败或跳过。
- artifact.md#03 已保留编号移至 2026-11-14 changelog，旧未提交改动保留。
