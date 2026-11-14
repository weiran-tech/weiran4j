---
title: "权限与设置恢复执行计划"
status: "ready"
updated_at: "2026-11-14"
derived_from: "../tasks.md"
---

# Exec Plan

## 1. 任务映射

| tasks.md 条目 | 执行单元 ID | 层 |
|---|---|---|
| 5.1 权限保护 | E1 | L1 |
| 5.2 设置恢复 | E1 | L1 |
| 5.3 身份刷新 | E1 | L1 |
| 5.4 docs 演示与规则 | E1 | L1 |
| 5.5 现状同步 | E1 | L1 |
| 6.1 交互回归 | E1 | L1 |
| 6.2 浏览器与门禁 | E1 | L1 |

### 未映射条目

无，各任务分别追溯，单执行单元串行实施。

### L7 测试基线

main，3ccd17d；保留原有 sys_task.md、部署手册及未提交批处理迁移。完整执行 project.json commands，不缩减后端门禁；JDK 21，spotlessApply 先于 check。

## 2. 依赖图

E1 内顺序：状态判定 → 权限/设置接入和回归 → 角色失效与回归 → docs 本地演示 → 文档 → 完整验证。无环，无跨后端契约依赖。

## 3. 分层执行计划

### Layer 0

不适用，共享层与迁移零命中。

### Layer 1

E1 实现全部前端需求，测试跟随对应实现；最后串行完成 docs 与门禁。

## 4. 契约冻结

| 契约 | 签名 / 结构 | 定义位置 | 消费方 | 冻结 |
|---|---|---|---|---|
| 查询状态 | isSuccess、isError、isFetching、data | 既有 Query hooks | E1 页面及 docs 共用可编辑判定 | ☑ |
| 身份查询键 | authKeys.me / menus 前缀 | hooks/queries/auth.ts | E1 角色成功回调失效，保留会话后缀 | ☑ |
| HTTP | 现有角色、安全设置、上传规则和配置接口 | 既有 hooks/queries | E1 沿用 DTO 与请求签名 | ☑ |

### 契约变更记录

无。

## 5. 并行判据与文件所有权

单执行单元，内部无并行，不启动 subagent，不创建 worktree。

| ID | 场景 | 判定 |
|---|---|---|
| WT-0 | 原有改动 | 用户已确认其他会话暂停，保留原有内容 |
| WT-1 | docs 与现状 | 与代码串行同步 |
| WT-2 | framework/流水线 | 不涉及 |
| WT-3 | 前端 | 本会话独占实施 |

| 执行单元 | 拥有(可写) | 只读 | 禁止触碰 |
|---|---|---|---|
| E1 | RoleMenuSheet、安全设置、上传设置、roles hooks 及测试；共享查询状态判定/反馈与测试；docs 状态演示、导航、主题桥接及必要构建别名；AGENTS.md、components.biz.md、sys_role.md、sys_config.md；本 change | auth hooks、Permission、API 类型、请求层、构建配置 | packages/server/**、semi-components/**、其他业务页、sys_task.md、部署手册与既有批处理迁移 |

## 6. 测试归属

E1 负责相应组件/hook 回归、docs 浏览器交互及网络隔离验证；完整门禁从 project.json 读取。

## 7. 失败与降级

修复实现回归后重试；同一门禁重试仍红则报告真实原因。环境问题保留日志，不伪造证据；设计不满足需求时回设计审阅。

## 8. 收尾要求

落盘 exec/notes/E1-frontend.md，按实际日志和交互生成 verify；不自动归档或提交。

## Gate

- [x] 每条任务分别映射
- [x] explore 共享层逐项比对，零命中
- [x] 无数据库变更，CP-7 不涉及
- [x] 依赖无环，无隐性接口变化
- [x] 已冻结原有契约
- [x] 测试跟随实现
- [x] 单执行单元，无文件归属交叉
- [x] 禁止触碰文件已写明
- [x] 失败策略已填
- [x] 未回写上游实现细节
