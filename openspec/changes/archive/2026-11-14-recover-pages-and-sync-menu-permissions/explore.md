---
title: "页面恢复与菜单同步现状"
status: "ready"
updated_at: "2026-11-14"
---

# Explore

## 调研范围

web 的 App、KeepAliveOutlet、page-registry、SearchToolbar、UsersPage、menus Query hooks；docs 复用已有 PageStateDemo 桥接。本轮不涉及后端。

## 现有实现

| 能力 | 位置 | 现状 |
|---|---|---|
| 错误恢复 | `packages/manage/src/App.tsx:113` | 根部仅 Suspense，没有错误边界 |
| 内容隔离 | `packages/manage/src/layouts/AdminLayout.tsx:661` | 内容区已有 Suspense，内部 KeepAliveOutlet，导航在外侧 |
| 页签缓存 | `packages/manage/src/layouts/KeepAliveOutlet.tsx:136` | 每个缓存页 Activity 与非缓存页按路径/刷新版本管理 |
| 动态加载 | `packages/manage/src/utils/page-registry.ts:45` | React.lazy 按组件路径缓存，失败实例没有失效入口 |
| 用户筛选 | `packages/manage/src/pages/system/users/UsersPage.tsx:437` | 快捷框绑定 draft.keyword，高级面板未补等价入口 |
| 响应式隐藏 | `packages/manage/src/styles/global.css:326` | lg-down 隐藏整组快捷搜索 |
| 菜单写入 | `packages/manage/src/hooks/queries/menus.ts:23` | 成功刷新 menuKeys 与 authKeys.menus，不刷新 authKeys.me |

## 可复用点

| 可复用对象 | 位置 | 方式 |
|---|---|---|
| 既有页面注册表 | utils/page-registry.ts | 保留稳定引用，增加失败实例恢复机制 |
| 页面缓存与刷新版本 | layouts/KeepAliveOutlet.tsx | 页面级边界与现有实例生命周期结合，不影响其他页签 |
| SearchField / SearchToolbar | components/SearchToolbar.tsx | 新增高级 keyword，仍共用草稿和查询函数 |
| authKeys / Permission | hooks/queries/auth.ts、components/Permission.tsx | 菜单写入成功补齐当前资料失效，测试真实权限呈现 |
| docs 桥接 | docs/.vitepress/theme/PageStateDemo.vue | 继续 ClientOnly 挂载，扩展本地演示 |

## 真实约束

- 懒加载失败的 React.lazy 会保留拒绝结果，重试必须重新创建对应加载实例；浏览器模块加载持久失败时仍需主动整页刷新兜底。
- 缓存页在 Activity 中独立存活，不能在一个内容边界捕获后清掉所有页签。
- keyword 已被后端支持，不引入 nickname 查询参数；高级条件与快捷条件须同一份 draft。
- me/menus 的实际键含会话后缀，必须按既有 authKeys 前缀失效。

## 影响面

### 普通改动

前端错误边界、懒加载包装与注册表、App/KeepAliveOutlet 必要接入、用户搜索入口、menus hooks 及对应测试；docs 演示与文案、组件登记、artifact/sys_user/sys_menu 现状及本 change。

### 共享层命中

#### 桶文件 / 注册表

| ID | 文件 | 冲突原因 | 是否命中 · 预计改动 |
|---|---|---|---|
| SL-1 | settings.gradle.kts | 模块发现 | 未命中 |
| SL-2 | weiran-dependencies/build.gradle.kts | BOM | 未命中 |
| SL-3 | weiran-app/build.gradle.kts | 应用聚合 | 未命中 |
| SL-4 | Flyway 菜单种子 | 菜单与序号 | 未命中，不新增菜单 |
| SL-5 | 页面注册表 | 组件解析 | 命中 page-registry，增加失败加载恢复；单执行单元先冻结，再接入页面 |

#### 跨模块契约

| ID | 文件 | 冲突原因 | 是否命中 · 预计改动 |
|---|---|---|---|
| SL-6 | CommonErrors.java | 错误码 | 未命中 |
| SL-7 | 框架分页 | 响应契约 | 未命中 |

#### 序号型资源与构建约定

无新增迁移、菜单 ID、依赖版本、BOM、build-logic 或 framework 改动。前端注册表先串行处理，后续仍由同一执行单元推进，无并行。

### 不会碰的目录

packages/server/**、packages/semi-components/**、其他业务页、流水线本体和部署配置；保留 sys_task、部署手册与批处理兼容迁移。

## 对 interview 的反向修正

无需求冲突。将 React.lazy 真实重试及页签隔离作为明确验收点，已纳入 interview AC-2/AC-3。

## 风险预警

| 风险 | 应对 |
|---|---|
| 清除边界却继续读失败 lazy | 重新建立加载实例，测试断言 loader 调用次数 |
| 错误卸载整个导航 | 页面级隔离，根部仅兜底外壳自身错误 |
| 扩展无关功能 | 不处理表单关闭、其他列表和上传原子性待办 |

## Gate

- [x] 共享层完整判定
- [x] 与 interview 无未决冲突
- [x] 复用点已核对，单会话串行
