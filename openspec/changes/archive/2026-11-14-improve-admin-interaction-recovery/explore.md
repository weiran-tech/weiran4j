---
title: "用户与地区页面交互现状"
status: "ready"
updated_at: "2026-11-14"
---

# Explore

## 调研范围

| 模块 | 目录/文件 | 为什么看它 |
|---|---|---|
| web | 用户、地区的列表和编辑弹窗 | 已确认的体验缺口 |
| web | 请求层、Query hooks、页面现有测试与 Semi FormApi 类型 | 核实错误恢复、初值比较和回归测试方式 |
| 后端 | 仅阅读契约和地区能力规格 | 确认无需改接口 |

## 现有实现

| 能力 | 位置 | 现状 |
|---|---|---|
| 用户列表 | `packages/manage/src/pages/system/users/UsersPage.tsx:109` | 只读取 data/isFetching/refetch，失败无持久反馈，成功空结果与失败空结果混用 |
| 用户表单 | `packages/manage/src/pages/system/users/UserFormModal.tsx:69` | onCancel 直接关闭；保存按钮已有 loading；没有未保存确认 |
| 地区筛选 | `packages/manage/src/pages/system/regions/RegionsPage.tsx:83` | 查询与清空条件都清空展开项，返回树中的祖先会遮住命中节点 |
| 地区表单 | `packages/manage/src/pages/system/regions/RegionFormModal.tsx:107` | onCancel 直接关闭，保存失败保留现有表单 |
| Query | `packages/manage/src/hooks/queries/users.ts:21` | 分页保留旧数据；必须区分首次失败与有缓存的刷新失败 |
| 请求错误 | `packages/manage/src/utils/request.ts:106` | 统一 Toast 并抛 ApiError；页面补持久反馈而非再次触发 Toast |

## 可复用点

| 可复用对象 | 位置 | 复用方式 | 需要改造吗 |
|---|---|---|---|
| SearchToolbar | `packages/manage/src/components/SearchToolbar.tsx` | 原样保留查询、重置和条件标签行为 | 否 |
| Semi Empty / Banner / Modal.confirm | 当前 Semi UI 依赖 | 组合成小型反馈组件及关闭保护 hook | 只增加项目封装 |
| FormApi | Semi Form 类型声明 | 读取当前值与初值，在内存比较实际变化 | 否 |
| mockFetch / renderWithProviders | `packages/manage/src/test/helpers.tsx` | 模拟失败后成功、延迟保存和树查询 | 否 |

## 真实约束

| 约束 | 证据位置 | 对设计的影响 |
|---|---|---|
| 用户表单含密码 | `UserFormModal.tsx:90` | 关闭保护只在内存工作，不记录草稿或日志 |
| 地区结果包含必要祖先 | `openspec/specs/administrative-regions/spec.md` FR-002 | 非空查询可展开返回树路径，不改查询语义 |
| 手动展开受控 | `RegionsPage.tsx:60` | 自动展开仅随已应用条件改变初始化，不随刷新反复覆盖 |
| 工作区已有其他改动 | interview 澄清记录 | 原样保留，用户已确认另一会话暂停 |

## 影响面

### 普通改动

| 文件/模块 | 动作 |
|---|---|
| 用户与地区列表 | 持久错误、重试、空态及地区展开初始化 |
| 用户与地区编辑弹窗 | 未保存关闭确认与保存中保护 |
| manage 组件/hook 及对应测试 | 新增可复用的小封装，验证状态转换 |
| components.biz.md、sys_user.md、region.md | 登记组件并同步已实现交互 |
| 本 change 规划与验证文件 | 记录设计、任务和证据 |

### 共享层命中

#### 桶文件 / 注册表

| ID | 文件 | 冲突原因 | 是否命中 · 预计改动 |
|---|---|---|---|
| SL-1 | settings.gradle.kts | 模块发现 | 未命中，不改模块 |
| SL-2 | weiran-dependencies/build.gradle.kts | BOM | 未命中，不改依赖 |
| SL-3 | weiran-app/build.gradle.kts | 应用聚合 | 未命中，不改后端 |
| SL-4 | Flyway 菜单种子 | 全局菜单和版本号 | 未命中，复用已有菜单 |
| SL-5 | manage 页面注册表 | 菜单与页面配对 | 未命中，无新增路由页面 |

#### 跨模块契约

| ID | 文件 | 冲突原因 | 是否命中 · 预计改动 |
|---|---|---|---|
| SL-6 | CommonErrors.java | 错误码 | 未命中，使用现有错误 |
| SL-7 | 框架分页响应 | 前后端共享契约 | 未命中，不改协议 |

#### 序号型资源与构建约定

| 对象 | 判定 |
|---|---|
| Flyway 版本号、菜单 ID | 未命中，不新增迁移或菜单 |
| build-logic | 未命中，不放宽质量规则 |
| 前端公共封装 | 单执行单元串行实现，无并行 agent |

### 不会碰的目录

- `packages/server/`、`packages/semi-components/`、`docs/`、`.github/`、后端构建与流水线守卫目录。
- manage 其他业务页面、导航布局和请求协议。

## 对 interview 的反向修正

无冲突。边界与验收标准维持 interview.md；现有 FormApi 和 Query 状态满足实现前提。

## 风险预警

| 风险 | 触发条件 | 建议应对 |
|---|---|---|
| 误判表单有改动 | 空值表示变化或数组引用变化 | 按实际字段内容比较，覆盖改回初值与无编辑测试 |
| 手动收起被覆盖 | 同条件后台刷新完成 | 展开初始化与条件变化关联，不与每次 data 更新关联 |
| 错误后隐藏旧数据 | 缓存刷新失败 | 持久错误独立于表格，保留缓存内容 |

## Gate

- [x] 共享层命中已完整列出
- [x] 与 interview 无冲突
- [x] 可复用点已确认
