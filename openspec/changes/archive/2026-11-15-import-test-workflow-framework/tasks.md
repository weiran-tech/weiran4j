---
title: "测试工作流实施清单"
status: "ready"
updated_at: "2026-11-15"
---

# Tasks

## 1. 测试共享契约与框架

- [x] 1.1 迁入统一目录、流程注册、CLI、脚手架与维护能力，集中测试依赖并建立离线回归（test-workflows/FR-001、test-workflows/FR-006）。
- [x] 1.2 保留严格批次执行、证据复核、取消与恢复报告，覆盖失败、跳过、flaky 和附件缺失（test-workflows/FR-002）。
- [x] 1.3 将会话、人工登录、缓存、请求与恢复适配为 Cookie/CSRF，覆盖身份/环境/角色校验及敏感材料保护（test-workflows/FR-003、test-workflows/FR-004）。

## 2. 系统流程与运行集成

- [x] 2.1 建立当前系统的 7 条 API/E2E/Bruno 流程、共享步骤、fixture 与协议装配/合成浏览器回归（test-workflows/FR-003、test-workflows/FR-004、test-workflows/FR-005）。
- [x] 2.2 接入根执行/检查脚本及独立 Node 24 CI 离线门禁，保留现有包内测试（test-workflows/FR-006、continuous-integration/FR-002）。

## 3. 文档与现状

- [x] 3.1 完成 docs 测试指南、测试目录文档、规则入口和现状记录，明确健康/登出边界及真实未覆盖项（test-workflows/FR-005、test-workflows/FR-006）。
