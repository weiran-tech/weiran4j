---
title: "下游第三方依赖版本清单 · 任务"
status: "done"
updated_at: "2026-10-04"
---

# Tasks

> **本文件是需求的权威源,粒度是「做什么」不是「怎么做」。**

## 0. 准备

- [x] 0.1 契约先行:§2.2 加「第三方依赖版本」一行与下游清单写法示例、白名单写法(FR-009、FR-010)
- [x] 0.2 决策记录 D-013(版本来源一分为二与防护)(FR-009、FR-010)

## 1. 共享契约层 `weiran-common`(TG-1)

> 本次不改 `weiran-common`;本组承载同属 Layer 0 的 BOM 与 build-logic。

- [x] 1.1 `weiran-dependencies`:框架层坐标快照、下游清单存在才 apply、记录下游新增约束、上游漂移白名单(两条及理由)(FR-009、FR-010)
- [x] 1.2 build-logic:`verifyFrameworkVersions` 任务(漂移、下游直接约束、空理由、过期白名单告警),boot-app 约定挂入 `check`(FR-010)

## 6. 规则与文档

- [x] 6.1 宪法 CP-4 改写为「框架版本在上游 BOM、业务版本在下游清单,各自只有一处」(FR-009)
- [x] 6.2 `AGENTS.md` 结构说明与 `project.md` SL-2 同步(FR-009)

## 7. 测试

- [x] 7.1 无清单:`runtimeClasspath` 改动前后一致,检查通过(FR-009、FR-010)
- [x] 7.2 临时清单四场景:未管理依赖可解析且通过 / 钉高失败 / 钉低失败 / 空理由失败;验后删除(FR-009、FR-010)
- [x] 7.3 全量 L7:`project.json` 的 build / test / lint

## 8. 发布

- [ ] 8.1 合入 main 后通知下游 mono4j:文件路径、写法示例、提交号

## 9. 上线后

- [x] 9.1 验收记录写入 `artifacts.md`(只写 verify.md 没有的:人读摘要 / 运行时验证 / 已知缺口)
