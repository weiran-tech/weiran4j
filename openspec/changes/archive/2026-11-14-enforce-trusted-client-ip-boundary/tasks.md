---
title: "可信 IP 边界实现任务"
status: "completed"
updated_at: "2026-11-14"
---

# Tasks

## 1. 共享契约层 weiran-framework (TG-1)

- [x] 1.1 建立显式可信代理配置、严格 IP/CIDR 解析与有界代理链策略，默认无代理信任（observability/FR-007）。
- [x] 1.2 提前缓存统一 IP 并保留 resolve 签名，禁止标准容器/Spring 转发处理先行改写（observability/FR-007）。

## 2. 部署与文档

- [x] 2.1 应用默认禁止先行转发处理，补充可信代理环境变量模板与 Nginx 边缘清洗（deployment/FR-002、observability/FR-007）。
- [x] 2.2 同步部署/架构文档与 docs 配置示例、直连/单层/多层输入结果表（deployment/FR-003）。

## 3. 测试

- [x] 3.1 覆盖 IPv4/IPv6、CIDR、等价地址、边界/非法/重复头与冲突配置回归（observability/FR-007）。
- [x] 3.2 验证真实 HTTP 下日志与短信上下文一致，以及伪造头不能改变 IP 限流桶（observability/FR-007）。
- [x] 3.3 验证 Nginx 配置与真实请求清洗、模板一致性和 docs 构建（deployment/FR-002、deployment/FR-003）。
- [x] 3.4 完成仓库 build/test/lint 门禁并记录证据。

## 4. 现状同步

- [x] 4.1 将已解决 artifact.md#03 移至 changelog，保留其他欠账与既有改动。
