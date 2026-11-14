---
title: "后台编辑保护与读取恢复现实校验"
status: "ready"
updated_at: "2026-11-14"
---

# Explore

## 调研范围

| 模块 | 目录/文件 | 为什么看它 |
|---|---|---|
| weiran-framework | 仅边界核对 | 无跨模块契约修改 |
| weiran-system-* | 仅现有接口引用索引 | 保持后端不变 |
| web | 三个表单文件、三个列表文件、两个日志页及两个公共对象 | 定点精读十个文件，确认关闭、查询和渲染分支 |
| docs | 页面状态演示的场景索引 | 复用现有 ClientOnly 与 Vue/React 挂载方式 |

## 现有实现

| 能力 | 位置 | 现状 |
|---|---|---|
| 编辑关闭 | `packages/manage/src/pages/system/roles/RoleFormModal.tsx:44`；`packages/manage/src/pages/system/menus/MenuFormModal.tsx:140`；`packages/manage/src/pages/system/dicts/DictFormModals.tsx:48`、`:112` | 直接关闭；只有 mutation loading，没有覆盖校验期的同步互斥 |
| 关闭与提交保护 | `packages/manage/src/hooks/useFormCloseGuard.ts:25` | 已有 ref 互斥、实际变更比较、确认框销毁及失败解锁能力 |
| 列表失败 | `packages/manage/src/pages/system/roles/RolesPage.tsx:45`；`packages/manage/src/pages/system/menus/MenusPage.tsx:41` | 仅消费 data/isFetching/refetch，无持续错误分支 |
| 字典主从查询 | `packages/manage/src/pages/system/dicts/DictsPage.tsx:20`、`:92` | 左右查询独立，均把未读到数据回退为空；右侧无重试入口 |
| 日志列表 | `packages/manage/src/pages/logs/LoginLogsPage.tsx:47`；`packages/manage/src/pages/logs/OperationLogsPage.tsx:82` | 首次失败变空表格，刷新失败无缓存说明 |
| 日志详情 | `packages/manage/src/pages/logs/OperationLogsPage.tsx:24` | isPending 或无 data 均显示 Spin，失败后不能结束加载 |
| 公共状态呈现 | `packages/manage/src/components/ListFeedback.tsx:11`、`:29` | 已有错误与缓存说明、可重试按钮和筛选空态 |

## 可复用点

| 可复用对象 | 位置 | 复用方式 | 需要改造吗 |
|---|---|---|---|
| useFormCloseGuard | hooks/useFormCloseGuard.ts | 四类弹窗直接调用 | 否 |
| ListFeedback / ListEmptyState | components/ListFeedback.tsx | 各列表组合状态 | 否 |
| QueryReadiness | components/QueryReadiness.tsx | 日志详情复用既有读取恢复组件；引用索引确认存在 | 预计无需改协议 |
| NavListPanel | components/NavListPanel.tsx | 字典主栏保留布局和分页，组合外部反馈与 emptyText | 预计无需改协议 |
| docs 页面状态场景 | docs/.vitepress/theme/PageStateDemoReact.tsx | 增加表单保护、列表、详情演示 | 是，扩展演示场景 |

## 真实约束

| 约束 | 证据位置 | 对设计的影响 |
|---|---|---|
| 表单值比较会消除空字段归一化噪声 | useFormCloseGuard.ts:9 | 复用既有比较，不另建 dirty 标记 |
| 列表有缓存与无缓存两种失败 | ListFeedback.tsx:17 | 使用 data 可用性区分，不用长度判断缓存是否存在 |
| 字典右侧依赖当前选中字典 | DictsPage.tsx:100 | 首次主列表失败不能显示“请选择字典”；缓存主列表失败仍保留已选项 |
| 树展开状态独立受控 | MenusPage.tsx:65 | 重试只 refetch，不重置展开、列偏好等状态 |
| docs 不得请求真实服务 | AGENTS.md 页面示例约定 | 使用本地查询模拟与实际公共对象，不依赖账号 |

## 影响面

### 普通改动

| 文件/模块 | 动作 |
|---|---|
| 四类表单（共三个文件） | 接入既有 guard |
| 六类列表（共五个文件） | 失败反馈、成功空态、就地重试 |
| OperationLogsPage.tsx 内嵌详情 | 读取状态恢复；必要时提取可复用呈现组件供 docs 挂载 |
| docs 与相关组件/页面测试 | 补齐可操作状态与回归 |
| state/bizs 对应模块 | 更新现状并关闭已认领条目 |

### 共享层命中

#### 桶文件 / 注册表

| ID | 文件 | 冲突原因 | 是否命中 · 预计改动 |
|---|---|---|---|
| SL-1 | settings.gradle.kts | 全仓模块发现 | 未命中，不新增模块 |
| SL-2 | weiran-dependencies/build.gradle.kts | BOM 单点 | 未命中，无依赖变化 |
| SL-3 | weiran-app/build.gradle.kts | 装配单点 | 未命中，无装配变化 |
| SL-4 | Flyway 种子菜单 | 菜单及权限资源 | 未命中，无新菜单 |
| SL-5 | pages 与 page-registry 配对 | 路由组件映射 | 仅修改已有页面交互，不新增页面或注册路径，无配对改动 |

#### 跨模块契约

| ID | 文件 | 冲突原因 | 是否命中 · 预计改动 |
|---|---|---|---|
| SL-6 | CommonErrors.java | 错误码共享 | 未命中 |
| SL-7 | page/response 契约 | 分页与包络共享 | 未命中 |

#### 序号型资源与构建约定

| 资源 | 判定 |
|---|---|
| Flyway 版本号、菜单 id | 未命中，无迁移和菜单变化 |
| build-logic、BOM、framework、依赖版本 | 未命中，不调整规则或依赖 |

共享层零修改，单执行单元串行推进。不会碰 `packages/server/`、`packages/semi-components/`、认证/布局/路由注册与流水线实现目录。既存 sys_task、部署说明、批处理兼容迁移作为已知无关脏文件保留；当前没有第二个活动 change，也无他人在并行推进的新增信号。两份日志现状文档的未提交条目由本会话上一轮审查生成，纳入本次处理。远端已 fetch，main 未落后。

## 对 interview 的反向修正

| 原结论 | 现实情况 | 修正后 | 是否已同步回 interview.md |
|---|---|---|---|
| 三类 P2 | 六类列表包含字典两个独立查询 | 无冲突，边界明确列出两侧 | ☑ 已体现 |

## 风险预警

| 风险 | 触发条件 | 建议应对 |
|---|---|---|
| 保存成功触发放弃提示 | 成功也走 requestClose | 成功直接 onClose，仅用户关闭入口走 guard |
| 首次失败显示空态 | 根据数组长度判断状态 | 先按查询状态判断，成功后才显示空态 |
| 文档演示偏离真实逻辑 | 重新实现 mock 弹窗逻辑 | 复用 guard 与状态呈现组件，实际业务页另做组件回归 |

## Gate

- [x] 共享层命中已完整列出
- [x] 与 interview 无冲突
- [x] 可复用点已确认
