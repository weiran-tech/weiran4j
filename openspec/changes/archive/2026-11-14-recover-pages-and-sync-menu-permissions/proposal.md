---
title: "页面异常恢复、响应式查询与菜单权限同步"
owner: "Codex"
status: "ready"
created_at: "2026-11-14"
updated_at: "2026-11-14"
---

# Proposal

## Why

页面渲染/懒加载失败缺少恢复边界；窄屏用户关键字入口丢失；菜单变更后当前按钮权限滞后。需求来源见 interview.md，现实依据见 explore.md。

## What Changes

- 页面错误恢复保留管理外壳，提供真实加载重试与返回首页。
- 高级筛选补齐共享 keyword，保持各屏幕查询能力一致。
- 菜单写入成功同步当前资料与菜单，失败保持已有身份。
- docs 共用实际交互演示，并同步现状追踪。

## Scope

### In Scope

页面边界与加载恢复、用户筛选、menus hooks、相关测试及 docs 演示、组件登记、对应三条待办。

### Out of Scope

- 不改后端、数据库、菜单种子、权限码、HTTP 契约或第三方依赖。
- 不扩展到其他列表失败态、表单草稿保护、上传原子保存和地区候选树问题。
- 不增加跨会话实时推送、全局日志上报服务、自动刷新循环。
- 不自动归档、commit、push；不触碰原有三处无关改动。

## Capabilities

| 能力 | delta 操作 | 说明 |
|---|---|---|
| `admin-foundation` | MODIFIED / ADDED | 菜单权限同步、页面故障恢复，沿用 docs 演示要求 |
| `user-list-search` | MODIFIED | 跨屏幕共享关键字查询入口 |

## 影响的包

| ID | 包 | 动作 | 影响说明 | Owner |
|---|---|---|---|---|
| PK-1 | weiran-framework | 不涉及 | 契约不变 | Codex |
| PK-2 | weiran-system-* | 不涉及 | 后端不变 | Codex |
| PK-3 | weiran-app | 不涉及 | 装配不变 | Codex |
| PK-4 | web | 改造 | 页面恢复、查询、缓存同步与 docs | Codex |

## 共享层影响(决定能否并行)

<!-- openspec:required-table mark=2 note=3 -->
| 类别 | 是否命中 | 说明 |
|---|---|---|
| settings / BOM / build-logic | ☐ | 不改模块与构建 |
| framework 错误码 / 分页 | ☐ | 不改契约 |
| weiran-app 聚合 | ☐ | 不改装配 |
| 页面注册表与入口 | ☑ | page-registry 与 App 页面错误恢复，先串行冻结加载恢复接口 |

## 横切关注点

<!-- openspec:required-table mark=2 note=3 -->
| 项 | 是否涉及 | 说明 |
|---|---|---|
| CC-1 权限点 | ☑ | 原权限码不变，当前 me 刷新 |
| CC-2 菜单 | ☑ | 当前菜单查询刷新，无新菜单 |
| CC-3 数据范围 | ☐ | 查询口径不变 |
| CC-4 多租户 | ☐ | 无租户变化 |
| CC-5 审计日志 | ☐ | 原写接口保持审计 |
| CC-6 字段脱敏 | ☑ | 异常界面不显示原始堆栈或敏感内容 |
| CC-7 幂等 | ☐ | 无新写入策略 |
| CC-8 导出 / 任务中心 | ☐ | 不涉及 |
| CC-9 工作流绑定 | ☐ | 不涉及 |

## Dependencies

使用既有 React、Semi UI、Query 和路由能力，无新依赖、数据库或部署变更；完整门禁读 project.json，另做 docs 构建与浏览器故障验证。

## Risks

| 风险 | 应对 |
|---|---|
| 假重试 | 断言失败 loader 真正重新调用 |
| 保活页串错 | 每页隔离，测试切换/刷新与正常页状态 |
| 筛选草稿分叉 | 同一 draft.keyword，复用原 search/reset/remove |

## Review Checklist

- [x] 范围与 interview 一致
- [x] 包和 Owner 已确认
- [x] 共享层命中已逐项判定
- [x] 横切关注点逐项核对
- [x] 无后端、数据与部署变化
- [x] 回归、docs 和浏览器验证已规划
