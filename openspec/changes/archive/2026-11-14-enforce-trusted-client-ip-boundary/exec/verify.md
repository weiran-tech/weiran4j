---
title: "可信客户端 IP 验收"
status: "passed"
approved_by: "用户"
approved_at: "2026-11-14"
updated_at: "2026-11-14"
---

# Verify

# 一、集成记录(L6)

单执行单元、单工作区，无并行集成。已读取 notes/E1-client-ip.md；Layer 0 定向 check 后冻结 C1/C2/C3，调用签名与业务限流阈值不变。

## 输入检查

- [x] E1 收尾笔记齐全
- [x] Layer 0 完成，契约未再变动
- [x] 定向自测与完整门禁通过

## 重复实现消除

IP 字面量和 CIDR 解析集中在框架策略；业务与日志均复用 resolve，无消费方重复解析。IT 审计断言复用 ClientIpTestSupport。

## 被牺牲的方案

未采用无条件信任私网、首项 XFF 或非法 XFF 降级读取 X-Real-IP；这些会扩大访客可控输入。未按 Controller 分散注入解析配置，避免来源漂移。

## 越界修改汇总

无新增越界。开工前已有 docs/.vitepress/config.mts、openspec/design/README.md、sys_task.md、批处理兼容迁移及部署说明一行保留；artifact.md 的前轮审计 #25/#26 保留。本次修改部署说明和 artifact.md 时仅增加 IP 边界相关内容。

# 二、规格一致性(L8)

## 前置条件:L7 硬闸门

全部通过，命令来自 openspec/project.json。使用 JDK 21；先 spotlessApply，再框架 check，最后依次全量执行，之后未修改源码。未运行 stash。

| 检查 | 命令 | 结果 | 证据 |
|---|---|---|---|
| build | `(cd packages/server && JAVA_HOME=${JAVA_HOME_21:-$(/usr/libexec/java_home -v 21)} ./gradlew assemble --no-daemon) && pnpm --filter @weiran/manage build` | ☑ 通过，exit 0 | [日志](evidence/build.log) |
| test | `(cd packages/server && JAVA_HOME=${JAVA_HOME_21:-$(/usr/libexec/java_home -v 21)} ./gradlew test --no-daemon) && pnpm --filter @weiran/manage test` | ☑ 通过，exit 0 | [日志](evidence/test.log) |
| lint | `(cd packages/server && JAVA_HOME=${JAVA_HOME_21:-$(/usr/libexec/java_home -v 21)} ./gradlew check --no-daemon) && pnpm --filter @weiran/manage lint` | ☑ 通过，exit 0 | [日志](evidence/lint.log) |

额外验证：docs 构建见 [docs.log](evidence/docs.log)，5 个真实 HTTP 回归见 [http.log](evidence/http.log)，临时隔离网络的 Nginx 配置与实际请求见 [nginx.log](evidence/nginx.log)；可复现脚本 nginx-check.py 完成后清理容器与网络。前端 52 个测试文件、428 个测试通过；框架 86、应用 78 个测试无失败或跳过。

## tasks.md 逐条核对

| tasks.md 条目 | 执行单元 | 实现位置 | 一致 |
|---|---|---|---|
| 1.1 | E1 | framework/web/IpAddress、TrustedProxyPolicy、TrustedProxyProperties | ☑ |
| 1.2 | E1 | ClientIpFilter、ClientIpResolver、框架 Web 自动配置 | ☑ |
| 2.1 | E1 | app/application.yml、.env.example、manage/nginx.conf | ☑ |
| 2.2 | E1 | docs/trusted-proxies.md、deployment/environment/contracts 与后端部署/契约文档 | ☑ |
| 3.1 | E1 | TrustedProxyPolicyTest、TrustedProxyConfigurationTest、ClientInfoTest | ☑ |
| 3.2 | E1 | ClientIpIT、UntrustedClientIpIT、ClientIpTestSupport | ☑ |
| 3.3 | E1 | nginx-check.py、EnvExampleTest、docs build | ☑ |
| 3.4 | E1 | evidence/build.log、test.log、lint.log | ☑ |
| 4.1 | E1 | artifact.md#03 的 changelog | ☑ |

未实现条目：无。

## design.md 一致性

| 设计要求 | 实现情况 | 一致 |
|---|---|---|
| DS-1 共用入口 | resolve 签名及 ClientContext 字段不变，请求内缓存统一规范化 IP | ☑ |
| DS-2 API / DS-3 数据库 | 无路由/DTO/错误码/表/迁移变更 | ☑ |
| DS-4 权限 | 无权限变更，短信只改变 IP 来源 | ☑ |
| DS-5 分层装配 | 框架 Spring Web 自动配置，未向 domain/api 增加依赖 | ☑ |
| DS-6 docs 演示 | 正常、非法回退、未配代理与多层示例均可访问 | ☑ |
| Observability | 访问/登录/操作日志与短信同源，未新增原始头日志 | ☑ |
| Rollout / Rollback | 文档给出最小信任范围和置空安全降级；尚未发布或提交 | ☑ |

## specs 验收标准核对

| spec / Scenario | 验收标准 | 验证方式 | 通过 |
|---|---|---|---|
| observability/FR-007 默认忽略伪造头 | AC-1，不可信来源不能通过头改变 IP | 默认/私网/loopback 单测；UntrustedClientIpIT | ☑ |
| 可信代理链定位 | AC-2，从右侧停止于首个非可信 | walksTrustedChain 与真实 HTTP 审计 | ☑ |
| 地址表示一致 | AC-2，IPv6、mapped、CIDR 边界 | normalizesIpv6AndMappedAddresses | ☑ |
| 非法与超限输入安全回退 | AC-3，重复/空/非法/4096/32 与单值兼容 | 策略参数化测试和 malformedForwardingFallsBack | ☑ |
| 配置与容器边界检查 | AC-3/AC-5，非法配置及标准转发处理启动失败 | TrustedProxyConfigurationTest；默认应用 ServerProperties.NONE | ☑ |
| 消费者口径一致 | AC-4，日志一致，伪造头不新建限流桶 | 三类日志同 IP；可信短信审计；同 peer 更换头和手机号第 21 次返回 409/100004 | ☑ |
| deployment/FR-002 容器化部署 | AC-5，边缘清洗、非可信上游忽略 | Nginx -t 与隔离网络真实请求三类断言；既有认证/停机回归由 app 全量测试覆盖 | ☑ |
| deployment/FR-003 部署文档与可信代理示例 | AC-5，配置/头/三类部署/发布验证齐全 | 后端部署 §4a、docs/trusted-proxies、environment、contracts；docs 构建通过 | ☑ |

本次未重建完整 Compose 生产镜像栈；Nginx 使用本机已有 stable-alpine（1.30.6）验证实际配置，应用使用真 Tomcat/MySQL/Testcontainers 验证 HTTP、日志和限流。没有将隔离测试声称为生产部署验收。原有 Compose 非 root 镜像与编排逻辑未改。

## 越界检查

git status/git diff 加上未跟踪新文件，对照 plan.md 所有权和 E1 notes：本次文件均属于框架、配置、消费者测试、Nginx、文档、问题追踪及本 change。既有无关文件单列，未修改构建规则、domain/api、权限/菜单、历史迁移或业务限流实现。无未申报越界。

## 不一致项归属判定

无剩余设计/规格偏离。开发期测试发现的 CIDR 位掩码问题属于代码错，已修复并重验；新增 IT 错误码和手机号脱敏断言属于测试错，按现有契约修正，没有更改业务规则迁就测试。

## 遗留问题

- 未配代理时退化为 proxy IP 是既定安全默认，部署前必须配置实际可信范围；不影响本次规格通过。
- 任意第三方自定义 remoteAddr 包装器不能被通用探测，部署契约明确禁止；标准 Boot 策略/ForwardedHeaderFilter 已覆盖。
- 短信/MFA 多实例内存状态仍按 artifact.md#25 跟踪，本次未扩大到分布式限流。
- 无新发现而未登记的问题。

## 流程反馈

本次单工作区串行推进，无 L4 分层缺陷。模板中的旧技术栈提示按仓库现行规则执行，既有模板欠账保持原登记。

## 结论

- [x] 集成完成，越界汇总已写
- [x] L7 三项全绿
- [x] tasks.md 全部覆盖
- [x] design/specs 一致
- [x] 无未申报越界
- [x] 不一致项已全部处置

**判定**：通过，进入 L9 人类审阅 diff。

## L9 最终审阅

用户在本会话明确回复「批准」，同意按已展示的 diff 摘要归档。本次不执行 commit、push 或生产部署。
