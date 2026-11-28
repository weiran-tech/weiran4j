---
title: "Wuli3 基座接入任务"
status: "draft"
updated_at: "2026-11-27"
---
# Tasks

## 1. 共享契约层 (TG-1)

- [x] 1.1 配置限定 group 的 GitHub Packages 认证仓库及 CI/容器安全注入。(FR-001)
- [x] 1.2 使用 Wuli3 1.1.1 BOM 管理基线并维持框架版本漂移防护。(FR-010)
- [x] 1.3 装配 core/MySQL starter，保持协议、单解析器及纯领域边界，补充装配回归。(FR-002)
- [x] 1.4 更新现行架构、开发与部署指南，说明 Wuli3 基础设施和 Weiran 兼容层边界。(FR-001, FR-002)

## 测试范围

真实仓库解析、依赖树、framework/app 全量测试、JDK 21 格式及质量门禁、OpenSpec 检查；测试跟随对应执行单元。

## 验证阶段修复

- [x] 8.1 修复 MP 默认聚合提前创建拦截器导致分页总数为零，并补充共存装配回归。(FR-002) 见 exec/verify.md 的不一致项归属判定。
