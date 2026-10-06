---
title: "部署与可观测性 · 任务"
status: "draft"
updated_at: "2026-10-06"
---

# Tasks

> 三个能力的 FR 编号会撞号,一律写全名:`admin-foundation/FR-001`、`observability/FR-00N`、`deployment/FR-00N`。

## 1. 共享契约层 `weiran-framework`(TG-1)

- [x] 1.1 新增 `ErrorResponse`,`GlobalExceptionHandler` 的所有失败分支改为产出它,`ApiResponseBodyAdvice` 放行它(admin-foundation/FR-001)
- [x] 1.2 新增 `RequestIdFilter`(入站白名单、生成、MDC、响应头、清理)并在自动配置里以最高优先级注册(observability/FR-001)
- [x] 1.3 `AuthInterceptor` 写 userId 请求属性;`RequestIdFilter` 在请求结束时打访问日志(observability/FR-003)
- [x] 1.4 `GlobalExceptionHandler` 日志分级:4xx 业务异常记 WARN 无堆栈,5xx / 未知异常记 ERROR 带堆栈(observability/FR-004)
- [x] 1.5 新增 `MdcTaskDecorator`(observability/FR-002)
- [x] 1.6 契约 §3 / §4:`X-Request-Id`、失败体 `requestId`、新增框架组件(admin-foundation/FR-001、observability/FR-001)

## 2. 应用与基础设施层 `*-application` / `weiran-app`(TG-3)

- [x] 2.1 操作日志线程池加 `MdcTaskDecorator`,注释写明等待时长 ≤ 停机阶段(observability/FR-002、observability/FR-006)
- [x] 2.2 `application.yml` 显式写出优雅停机配置与 `WEIRAN_SHUTDOWN_TIMEOUT`(observability/FR-006)
- [x] 2.3 新增 `logback-spring.xml`:控制台 + 按天滚动文件 + SQL 单独文件;`local` / `test` 只输出到控制台;`WEIRAN_LOG_DIR` / `WEIRAN_LOG_MAX_HISTORY`(observability/FR-005)

## 3. 前端 `web`(TG-5)

- [x] 3.1 `request.ts`:`ApiError.requestId`(取失败体字段,退回响应头);Toast 显示前 8 位、console 打完整值;`types/api.ts` 加 `ApiErrorBody`(admin-foundation/FR-001、observability/FR-001)

## 4. 部署(#18 / #09)

- [x] 4.1 整份重写 `weiran4j/.env.example`(deployment/FR-001)
- [x] 4.2 `weiran4j/Dockerfile`、`web/Dockerfile`、`web/nginx.conf`、`docker-compose.yml`、`.dockerignore`;根 `.gitignore` 补 `.env`(deployment/FR-002)
- [x] 4.3 `weiran4j/docs/02-部署.md`,并在 AGENTS.md 与契约中链接(deployment/FR-003)
- [x] 4.4 `artifact.md`:#09 / #10 / #11 / #18 按实际结果移入 §7 changelog 或标 🟡(deployment/FR-003、observability/FR-001)

## 5. 测试

- [x] 5.1 framework 单测:`RequestIdFilter`(沿用 / 生成 / 非法 / 响应头 / MDC 清理 / 访问日志内容与级别 / 不含查询值)、`MdcTaskDecorator`、`GlobalExceptionHandler` 日志分级与 `ErrorResponse`(observability/FR-001 至 FR-004、admin-foundation/FR-001)
- [x] 5.2 集成测试:失败体 `requestId` 与响应头一致(400 / 401 / 403 / 404)、成功体没有 `requestId`、入站 ID 沿用与非法 ID 重新生成、停机配置值(admin-foundation/FR-001、observability/FR-001、observability/FR-006)
- [x] 5.3 `.env.example` 与 `application.yml` 占位符一致性测试(deployment/FR-001)
- [x] 5.4 前端 `request.test.ts`:Toast 含请求号、`ApiError.requestId`、成功响应不受影响(observability/FR-001)
- [x] 5.5 容器验证:`docker compose build` / `up`、经 Nginx 走 curl 登录 → `/me`、`exec id -u`、日志文件格式与 SQL 分离、`stop` 时出现优雅停机日志(deployment/FR-002、observability/FR-005、observability/FR-006)

## 6. 发布

- [x] 6.1 部署文档覆盖首次部署与升级;本次没有数据库变更

## 7. 上线后

- [x] 7.1 验收记录写入 `artifacts.md`(给人读的摘要、容器验证操作、已知缺口)
