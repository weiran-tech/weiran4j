---
title: "权限与设置恢复现状及 docs 演示入口"
status: "ready"
updated_at: "2026-11-14"
---

# Explore

## 调研范围

| 模块 | 目录/文件 | 为什么看它 |
|---|---|---|
| web | RoleMenuSheet、roles/auth Query hooks | 核实误清空风险与身份缓存刷新入口 |
| web | SecuritySettingsPage、UploadSettingsPage | 核实必要查询与草稿状态 |
| docs | .vitepress/theme、config.mts、components 文档 | 复用现有 Vue/React 演示挂载方式 |

## 现有实现

| 能力 | 位置 | 现状 |
|---|---|---|
| 权限加载与保存 | `packages/manage/src/pages/system/roles/RoleMenuSheet.tsx:48` | 详情缺失回退空数组，只按 isPending 禁用，失败后可提交空值 |
| 角色变更 | `packages/manage/src/hooks/queries/roles.ts:38` | 角色创建/编辑/删除只失效 roleKeys，分配权限仅失效详情 |
| 当前身份 | `packages/manage/src/hooks/queries/auth.ts:44` | me/menus 查询含会话键，staleTime=Infinity；按 authKeys 前缀失效可匹配活动会话 |
| 安全设置 | `packages/manage/src/pages/system/security/SecuritySettingsPage.tsx:51` | !data 一律显示加载中，首次错误没有恢复入口 |
| 上传设置 | `packages/manage/src/pages/system/upload-settings/UploadSettingsPage.tsx:33` | settings 与 configs 两个查询，未处理错误；draftOverride 保存本地修改 |
| 演示挂载 | `docs/.vitepress/theme/ComponentGallery.vue:12` | ClientOnly 下动态加载 React root，可沿用同样桥接模式 |

## 可复用点

| 可复用对象 | 位置 | 复用方式 | 需要改造吗 |
|---|---|---|---|
| ListFeedback | manage/src/components/ListFeedback.tsx | 复用持久失败、重试按钮与忙碌反馈，调用方提供动作 | 可按页面措辞扩展可选文案 |
| Permission 与 PermissionContext | manage/src/components/Permission.tsx、hooks/usePermission.ts | 页面与 docs 用同一权限呈现逻辑 | 否 |
| QueryClient 失效机制 | hooks/queries/roles.ts、auth.ts | 角色写入成功后按身份前缀失效 | 小型共用动作 |
| 组件演示桥接 | docs/.vitepress/theme/ComponentGallery.vue | 新页面状态演示按既有模式注册 | 增加演示入口 |
| 既有 mockFetch / renderWithProviders | manage/src/test/helpers.tsx | 失败重试、延迟请求及身份更新回归 | 否 |

## 真实约束

| 约束 | 证据位置 | 对设计的影响 |
|---|---|---|
| 空权限是合法全量覆盖 | RoleMenuSheet.tsx 与 RoleApplicationService.assignMenus | 不能仅以 menuIds 长度决定是否可保存 |
| 上传设置依赖两份数据 | UploadSettingsPage.tsx | 两个查询分别可重试，任何必要数据失败都禁止保存 |
| docs 为静态站 | docs/package.json | 演示用本地数据，复用无请求的实际视图，避免依赖业务服务 |
| 三处已有无关代码/文档改动 | 用户此前确认会话暂停 | 原样保留，不纳入本 change |

## 影响面

### 普通改动

- 角色权限分配、安全设置、上传设置及其状态视图与测试。
- roles Query hooks 与权限同步测试；既有 auth 查询键保持不变。
- docs 页面状态演示与 Vue/React 桥接、导航入口和使用说明；AGENTS.md 演示归属规则已按用户要求更新。
- sys_role.md、sys_config.md、必要的组件登记与本 change。

### 共享层命中

#### 桶文件 / 注册表

| ID | 文件 | 冲突原因 | 是否命中 · 预计改动 |
|---|---|---|---|
| SL-1 | settings.gradle.kts | 模块发现 | 未命中，不改后端模块 |
| SL-2 | weiran-dependencies/build.gradle.kts | BOM | 未命中，不改后端依赖 |
| SL-3 | weiran-app/build.gradle.kts | 应用聚合 | 未命中，不改装配 |
| SL-4 | Flyway 菜单种子 | 菜单与版本号 | 未命中，不新增管理菜单 |
| SL-5 | 页面注册表 | 菜单组件配对 | 未命中，只改已有业务页面；docs 导航属静态文档入口 |

#### 跨模块契约

| ID | 文件 | 冲突原因 | 是否命中 · 预计改动 |
|---|---|---|---|
| SL-6 | CommonErrors.java | 错误码 | 未命中，复用现有错误 |
| SL-7 | 框架分页响应 | 前后端契约 | 未命中，不改响应 |

#### 序号型资源与构建约定

| 对象 | 判定 |
|---|---|
| Flyway 版本号、菜单 ID | 未命中，无新增数据或迁移 |
| build-logic / 质量规则 | 未命中，不放宽门禁 |
| 前端状态视图 / docs 入口 | 本 change 单执行单元串行处理，复用视图先于演示接入 |

### 不会碰的目录

- packages/server/、packages/semi-components/、.github/、openspec 守卫及 schema。
- manage 中地区、用户、导航布局等其他业务实现；原有 sys_task.md 和部署文档。

## 对 interview 的反向修正

用户新增 docs 状态演示及 AGENTS.md 规则要求，已回写 interview.md 第 3/4 条澄清记录和 AC-7；不扩大到历史全部演示迁移。

## 风险预警

| 风险 | 触发条件 | 应对 |
|---|---|---|
| 保存按钮禁用但处理器仍允许提交 | 程序触发或状态交错 | 事件处理器也核实两个查询的可用状态 |
| 重试丢失本地编辑 | 用整页刷新恢复 | 使用 query.refetch，保留草稿 |
| docs 与实际行为漂移 | 演示复制另一套状态条件 | 复用无请求状态视图，演示使用同一可编辑判定/权限呈现逻辑 |

## Gate

- [x] 共享层已逐项判定
- [x] 用户追加范围已回写 interview
- [x] 可复用点已确认，单执行单元，不启动 subagent
