---
title: "后台交互恢复执行计划"
status: "ready"
updated_at: "2026-11-14"
derived_from: "../tasks.md"
---

# Exec Plan

## 1. 任务映射

| tasks.md 条目 | 执行单元 ID | 层 |
|---|---|---|
| 1.1 列表反馈 | E1 | L1 |
| 1.2 表单保护 | E1 | L1 |
| 1.3 地区展开 | E1 | L1 |
| 1.4 组件登记与现状 | E1 | L1 |
| 2.1 交互回归 | E1 | L1 |
| 2.2 门禁和浏览器验证 | E1 | L1 |

### 未映射条目

无，单执行单元串行处理，各条任务独立回指和验收。

### L7 测试基线

- 基线：main，2279771；原有三处未提交改动保留，用户已确认其他会话暂停。
- 正式门禁使用 project.json 的 commands 原命令，JDK 21，后端不并行 clean；后端与已有改动的影响如实归因，不 stash 他人改动。

## 2. 依赖图

E1 内部顺序：共享前端封装 → 页面接入与树展开 → 交互测试 → 文档同步 → 门禁与验证。无并行单元、无后端契约依赖。

## 3. 分层执行计划

### Layer 0

不适用，explore 中的 BOM、build-logic、framework、迁移和注册表均未命中。

### Layer 1

E1 串行实现 ListFeedback、useFormCloseGuard，接入 UsersPage/UserFormModal 与 RegionsPage/RegionFormModal；验证并同步文档。

## 4. 契约冻结

| 契约 | 签名 / 结构 | 定义位置 | 消费方 | 冻结 |
|---|---|---|---|---|
| 既有 HTTP | 原用户分页与地区树查询、保存接口不变 | hooks/queries/users.ts、regions.ts | E1 沿用 data/isFetching/isError/refetch 与 mutateAsync | ☑ |
| 列表反馈 | 页面提供错误、加载、是否有数据、重试和清空回调 | components/ListFeedback.tsx | E1 两个列表消费 | ☑ |
| 表单关闭 | 读取表单当前值/初值、保存状态与关闭回调 | hooks/useFormCloseGuard.ts | E1 两个编辑弹窗消费 | ☑ |

### 契约变更记录

无。

## 5. 并行判据与文件所有权

单执行单元，内部无并行，不创建 worktree 或 subagent。

| ID | 场景 | 判定 |
|---|---|---|
| WT-0 | 他人工作区改动 | 用户确认会话暂停，保留原始改动，不触碰 |
| WT-1 | 文档 | 与本次实现串行同步 |
| WT-2 | framework/流水线本体 | 不涉及 |
| WT-3 | 单模块前端改动 | 当前仅本会话推进 |

| 执行单元 | 拥有(可写) | 只读 | 禁止触碰 |
|---|---|---|---|
| E1 | ListFeedback.tsx、useFormCloseGuard.ts 及相应测试；users/UsersPage.tsx、UserFormModal.tsx 及测试；regions/RegionsPage.tsx、RegionFormModal.tsx 及测试；components.biz.md；sys_user.md、region.md；本 change 文件 | 既有请求层、query hooks、Semi 依赖、契约和构建配置 | packages/server/**、packages/semi-components/**、其他页面与布局、sys_task.md、部署文档和既有批处理迁移 |

## 6. 测试归属

E1 负责用户和地区页面回归、新封装测试及真实浏览器验证；测试跟随实现，不拆独立执行单元。全量门禁从 project.json 读取。

## 7. 失败与降级

先修复实现回归再重试；同一门禁连续失败按 workflow 规则报告真实阻塞。环境阻塞保留日志，不伪造验证结果。若设计不满足需求则回设计审阅，不擅自缩减。

## 8. 收尾要求

实现完成在 exec/notes/E1-frontend.md 记录行为、测试及必要连带；再按真实证据生成 verify。

## Gate

- [x] 每条 task 已映射
- [x] explore 共享层清单已比对，无命中
- [x] 无数据库结构变更，CP-7 不涉及
- [x] 依赖无环，无前后端隐性契约变更
- [x] 无 Layer 0，既有契约冻结已列出
- [x] 无独立测试执行单元
- [x] 单执行单元，无文件集交叉
- [x] 已写明禁止触碰文件
- [x] 已填失败处置
- [x] 未向 tasks/design/specs 回写实现细节
