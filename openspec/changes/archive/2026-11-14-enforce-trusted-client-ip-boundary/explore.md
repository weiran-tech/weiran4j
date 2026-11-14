---
title: "可信 IP 边界现状"
status: "draft"
updated_at: "2026-11-14"
---

# Explore

## 调研范围

先检索模块结构，再索引 IP 解析与消费者，定点精读解析器、自动配置、属性类、请求日志过滤器、操作日志切面、现有单测、应用配置和观测集成测试，最后反查 ClientIpResolver 与 clientOf 引用。源码精读不超过 10 个文件；部署文件另行核对。

| 模块 | 目录/文件 | 为什么看它 |
|---|---|---|
| weiran-framework | web、autoconfigure、log | IP 来源和统一装配 |
| weiran-system | AuthController 与短信服务的引用索引 | 登录上下文及限流消费者 |
| weiran-app | application.yml、ObservabilityIT | 容器行为配置与集成验证 |
| web | packages/manage/nginx.conf | 默认代理边界 |

## 现有实现

以下 Java 相对位置均位于 packages/server 对应模块 src/main/java/com/wulicode/weiran 下。

| 能力 | 位置 | 现状 |
|---|---|---|
| IP 解析 | weiran-framework/.../framework/web/ClientIpResolver.java:22 | 无条件先取 XFF 首项，再取 X-Real-IP，最后 remoteAddr |
| 访问日志 | weiran-framework/.../framework/web/RequestIdFilter.java:84 | finally 内调用共用解析器 |
| 操作日志 | weiran-framework/.../framework/log/OperationLogAspect.java:115 | 调用同一解析器 |
| 登录上下文 | weiran-system/weiran-system-adapter/.../system/adapter/web/AuthController.java:305 | clientOf 汇总 IP 与 UA，短信 Controller 复用 |
| 老测试 | weiran-framework/src/test/java/.../framework/web/ClientInfoTest.java:42 | 断言无条件信任转发头，必须替换 |
| 默认代理 | packages/manage/nginx.conf | 使用 proxy_add_x_forwarded_for，保留访客可控的链前缀 |
| 应用配置 | packages/server/weiran-app/src/main/resources/application.yml:1 | 尚未显式禁止容器处理转发头 |

## 可复用点

| 可复用对象 | 位置 | 复用方式 | 需要改造吗 |
|---|---|---|---|
| ClientIpResolver.resolve | framework/web | 保留签名，读过滤器解析结果，无属性则取直接对端 | 是 |
| WeiranFrameworkAutoConfiguration | framework/autoconfigure | 注册属性和过滤器，维持模块自装配 | 是 |
| AuthController.clientOf | system-adapter | 保持所有登录与短信消费者共用入口 | 原则上无需改签名 |
| EnvExampleTest、ObservabilityIT | weiran-app/src/test | 配置一致性和真实 HTTP 回归 | 扩展 |

## 真实约束

| 约束 | 证据位置 | 对设计的影响 |
|---|---|---|
| 日志和短信限流共用 IP | ClientIpResolver 的引用与 client.ip() 索引 | 安全策略必须统一，不能仅修日志 |
| 请求日志在 finally 取 IP | RequestIdFilter | 新过滤器须提前缓存结果且请求结束前不删除 |
| Compose 默认网络无固定代理 IP | docker-compose.yml | 不假定固定容器地址，不自动信任全部私网 |
| 配置模板集合一致性检查 | weiran-app 的 EnvExampleTest | 新环境变量必须同步模板 |
| 单工作区，已有稳定未提交文件 | git status，WT-0～WT-3 | 串行推进；保留既有 docs 配置、sys_task、迁移及部署说明改动，取 diff 时区分 |

## 影响面

### 普通改动

| 文件/模块 | 动作 |
|---|---|
| framework/web、autoconfigure 及其测试 | Layer 0：新增可信代理策略、过滤器，改造解析器 |
| weiran-app 配置和集成测试 | 禁止先行改写地址，配置可信代理并验证消费者 |
| packages/manage/nginx.conf | 清洗转发头 |
| .env.example、02-部署.md、01-架构与接口契约.md | 配置说明和跨接口行为同步 |
| openspec/state/bizs/artifact.md#03 | 认领和完成追踪 |

### 共享层命中 ⚠️

#### 桶文件 / 注册表

| ID | 文件 | 是否命中 · 预计改动 |
|---|---|---|
| SL-1 | settings.gradle.kts | 未命中，不增模块 |
| SL-2 | weiran-dependencies/build.gradle.kts | 未命中，不增依赖 |
| SL-3 | weiran-app/build.gradle.kts | 未命中，沿用现有测试依赖 |
| SL-4 | Flyway 菜单迁移 | 未命中，不增菜单 |
| SL-5 | pages 与 page-registry | 未命中，不改页面 |

#### 跨模块契约

| ID | 文件 | 是否命中 · 预计改动 |
|---|---|---|
| SL-6 | framework/error/CommonErrors.java | 未命中，不改错误码 |
| SL-7 | framework/page、response | 未命中，不改分页/包络 |
| 补充 | framework/web 与自动配置 | 命中：全模块共享 IP 行为，必须串行 Layer 0 先完成并冻结 |

#### 序号型资源与构建约定

- Flyway 版本号、菜单 id：未命中；不生成迁移。
- build-logic 与 BOM：未命中；不放宽质量规则。
- 不会碰：业务 domain/api、持久化表及迁移、前端页面/组件、openspec 校验器与规则、已有无关迁移。

## 对 interview 的反向修正

无冲突。直接代理网段属于部署参数，不在仓库中猜测固定值。

## 风险预警

| 风险 | 触发条件 | 建议应对 |
|---|---|---|
| 限流桶合并为代理地址 | 部署后未配置实际可信代理 | 发布前配置并验证；默认不信任仍是安全降级 |
| 容器提前改写 peer | 启用 native/framework 转发处理 | 显式 none，启动检查冲突配置 |
| 多层代理链被客户端污染 | 外层未清洗，内层盲取首值 | 右向左解析，默认边缘 Nginx 覆盖头，多层只信任指定上游 |

## Gate

- [x] 共享层命中已完整列出
- [x] 与 interview 的冲突项已回写 interview.md（无冲突）
- [x] 可复用点已确认
