---
title: "后台编辑与读取恢复执行计划"
status: "ready"
updated_at: "2026-11-14"
derived_from: "../tasks.md"
---

# Exec Plan

## 1. 任务映射

| tasks.md 条目 | 执行单元 ID | 层 |
|---|---|---|
| 5.1 | E1 | L1 |
| 5.2 | E1 | L1 |
| 5.3 | E1 | L1 |
| 5.4 | E1 | L1 |
| 6.1 | E1 | L1 |
| 6.2 | E1 | L1 |

验证追加条目 6.3 属于 E1 验收发现的必要修正，按 verify.md 记录，不新增预设执行单元。

### 未映射条目

无。

### L7 测试基线

main / 20c76e3。只执行 openspec/project.json 的完整 build/test/lint 命令，不简化为前端。无关既存 sys_task、部署文档与兼容迁移保持原状，不纳入 change。已知本会话生成的两份日志审查条目纳入本次解决。

## 2. 依赖图

单单元 E1：表单接入 → 列表与详情呈现 → docs 与回归 → 完整验证，无环。

## 3. 分层执行计划

### Layer 0

不适用：共享层零修改，不改 BOM、framework、build-logic、数据库或路由注册。

### Layer 1

E1 串行处理所有页面、演示与对应测试，不委派并行。

## 4. 契约冻结

| 契约 | 签名 / 结构 | 定义位置 | 消费方 | 冻结 |
|---|---|---|---|---|
| 编辑 guard | saving / requestClose / submit(callback) | hooks/useFormCloseGuard.ts | E1 四类弹窗与 docs 读写表单、关闭与保存 | ☑ |
| 列表反馈 | hasData / retrying / onRetry / label | components/ListFeedback.tsx | E1 六类列表与 docs 读取查询状态 | ☑ |
| 查询呈现 | data / isSuccess / isError / isFetching | components/QueryReadiness.tsx | E1 日志详情与 docs 读取状态，不发请求 | ☑ |
| 查询与 mutation | 既有 key、参数和保存体 | hooks/queries | E1 只消费，不改后端协议 | ☑ |

无契约变更记录。

## 5. 并行判据与文件所有权

| ID | 判定 |
|---|---|
| WT-0 | 无第二个活动 change；既存无关修改不动，无新增并行信号 |
| WT-1 | 文档随本次串行处理，不改流水线 |
| WT-2 | 不改 framework 或流水线实现 |
| WT-3 | 单执行单元，内部无并行，不使用 worktree |

| 执行单元 | 拥有(可写) | 只读 | 禁止触碰 |
|---|---|---|---|
| E1 | pages/system/roles/{RoleFormModal,RolesPage}.tsx；pages/system/menus/{MenuFormModal,MenusPage}.tsx；pages/system/dicts/{DictFormModals,DictsPage}.tsx；pages/logs/{LoginLogsPage,OperationLogsPage}.tsx；对应新增或已有 __tests__；components/OperationLogDetails.tsx 及对应测试（必要提取）；docs/.vitepress/theme/*State* 与新增演示支持文件、docs/page-states.md；openspec/rules/advisory/components.biz.md；state/bizs/{artifact,sys_role,sys_menu,sys_group,sys_login_log,sys_operation_log}.md；本 change 目录 | 其他前端、公共 guard、查询、QueryReadiness、ListFeedback、NavListPanel、现有规格 | packages/server/**、packages/semi-components/**、App.tsx、认证与布局、流水线实现、无关工作区修改 |

拥有前端路径均相对于 packages/manage/src。必要连带若超出清单，先在执行笔记申报因果，不修改已批准设计。

## 6. 测试归属

E1 编写并执行实际弹窗、列表和详情行为回归，测试跟随实现。docs 使用本地模拟，浏览器验证无真实服务请求；源码最终修改完成后再产生 L7 证据。

## 7. 失败与降级

同一检查失败先定位并修复，重跑一次；仍失败则报告日志，不猜测放宽规则。无并行冲突降级；若需改变已批准行为，停下重开设计。新发现且无法纳入本次的缺陷记录对应 state。

## 8. 收尾要求

写 exec/notes/E1-frontend.md，声明实际文件、验证、必要连带与未处理事项。逐条跑 project.json commands 到 evidence；只在任务全部完成、证据有效后生成 verify。

## Gate

- [x] 每条 task 都已映射
- [x] 共享层逐项比对，无命中
- [x] 无数据库结构变更，CP-7 无需迁移
- [x] 依赖图无环，契约已识别
- [x] 契约冻结表已列出
- [x] 无独立测试执行单元
- [x] 单执行单元无交叉文件集
- [x] 禁止触碰已声明
- [x] 失败与降级策略已填
- [x] 未回写 tasks/design/specs
