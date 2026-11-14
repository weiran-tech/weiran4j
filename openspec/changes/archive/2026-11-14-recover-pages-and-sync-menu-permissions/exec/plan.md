---
title: "页面恢复与权限同步执行计划"
status: "ready"
updated_at: "2026-11-14"
derived_from: "../tasks.md"
---

# Exec Plan

## 1. 任务映射

| tasks.md 条目 | 执行单元 ID | 层 |
|---|---|---|
| 5.1 页面恢复 | E1 | L0/L1 |
| 5.2 关键字 | E1 | L1 |
| 5.3 菜单同步 | E1 | L1 |
| 5.4 docs与现状 | E1 | L1 |
| 6.1 回归 | E1 | L0/L1 |
| 6.2 浏览器和门禁 | E1 | L1 |

验证阶段追加的 6.3 不虚构预设执行单元，由当前 E1 处理，原因与处置详见 exec/verify.md；本段用于满足 L4/task-mapped 的硬性覆盖校验，不改预设映射表。

### 未映射条目

无，各条分别追溯，单执行单元串行。

### L7 测试基线

main，8bb458a；原有sys_task、部署手册和批处理迁移保留。完整执行project.json命令，JDK21，spotlessApply在check前。

## 2. 依赖图

E1内顺序：注册表加载契约 → 页面边界/真实重试与保活测试 → 查询与菜单同步及测试 → docs与现状 → 完整验证。无环。

## 3. 分层执行计划

### Layer 0

先冻结page-registry原始loader签名并导出类型；已有lazy helper兼容保留，恢复组件使用原loader并在主动重试时创建新lazy实例。

### Layer 1

E1串行实现PageErrorBoundary、RecoverablePage、App接入及保活回归；KeywordSearchInput与用户高级查询；menus hooks；docs与现状。

## 4. 契约冻结

| 契约 | 签名 / 结构 | 定义位置 | 消费方 | 冻结 |
|---|---|---|---|---|
| loader | () => Promise<{default:ComponentType}> | page-registry | E1恢复包装读取loader，主动重试创建新lazy | ☑ |
| 查询 | draft.keyword → toQuery | UsersPage | E1两个输入共用草稿及search/reset/remove | ☑ |
| 身份 | authKeys.me/menus前缀 | queries/auth | E1菜单写入成功失效 | ☑ |

### 契约变更记录

无。

## 5. 并行判据与文件所有权

单执行单元，内部无并行，不创建worktree或subagent。

| ID | 场景 | 判定 |
|---|---|---|
| WT-0 | 原有改动 | 用户此前确认其他会话暂停，保留原三处内容 |
| WT-1 | 文档 | 与代码串行 |
| WT-2 | framework/流水线本体 | 不涉及 |
| WT-3 | 前端 | 本会话独占实施 |

| 执行单元 | 拥有(可写) | 只读 | 禁止触碰 |
|---|---|---|---|
| E1 | page-registry、App、必要main/KeepAliveOutlet接入及测试；PageErrorBoundary、RecoverablePage、KeywordSearchInput及测试；UsersPage及测试；menus hooks及测试；docs状态演示及必要样式；components.biz与既有组件清单的对应说明、list-view关键字建议；artifact/sys_user/sys_menu现状；本change | 原API类型、请求、auth hooks、其他布局组件 | packages/server/**、semi-components/**、其他业务页、sys_task、部署手册、原迁移、流水线本体 |

## 6. 测试归属

E1负责边界、加载、保活、用户查询、菜单成功失败回归、docs浏览器；无独立测试单元。

## 7. 失败与降级

修复回归再重试；同一门禁重试仍红报告实际原因，环境问题保存日志，设计缺陷回审阅。

## 8. 收尾要求

落盘exec/notes/E1-frontend.md，依据真实门禁与浏览器结果写verify，停在L9。

## Gate

- [x] 每条任务分别映射
- [x] 共享命中落在L0串行
- [x] 无数据库变更，CP7不涉及
- [x] 依赖无环，HTTP不变
- [x] 契约已冻结
- [x] 测试跟随实现
- [x] 单执行单元无文件交叉
- [x] 禁止触碰已写明
- [x] 失败策略已填
- [x] 无上游实现细节回写
