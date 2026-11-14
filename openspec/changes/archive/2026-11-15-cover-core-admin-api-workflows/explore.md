---
title: "API 工作流现状与影响面"
status: "ready"
updated_at: "2026-11-15"
---

# Explore

## 调研范围

先列 Controller/IT 目录，再索引 Mapping、Permission、DisplayName，最后定点读取 RoleController、DictController、RegionController、PlatformIT 片段及既有测试工具。未全仓精读业务实现；无需修改 Java 符号。

| 模块 | 目录/文件 | 为什么看它 |
|---|---|---|
| weiran-framework | Cookie/响应契约、现有 tests/framework/session.mjs | 复用 Cookie/CSRF 与数字 code，不改生产实现 |
| weiran-system | adapter/web Controller、weiran-app 现有 IT | 业务 HTTP 路径、版本协议与已有业务约束 |
| weiran-region | RegionController/PublicRegionController | 区分公开 lookup、登录 lookup、管理权限与非分页列表 |
| web | tests/Playwright、docs/testing.md | 无业务页面修改；复用测试入口与文档 |

## 现有实现

| 能力 | 位置 | 现状 |
|---|---|---|
| API 用例覆盖 | tests/registry.json:3；tests/docs/coverage.md:5 | 仅健康、匿名鉴权、登录会话，缺业务资源外部工作流 |
| 会话工具 | tests/framework/session.mjs:113、156、161、176 | 请求维护 Cookie/CSRF；远端身份核验；私有恢复和正常登出 |
| 流程参数 | tests/framework/core.mjs:151 | FLOW_<NAME> 或 --param，运行记录仅存参数名；可声明 ALLOW_WRITE 并在 fixture 严格判断 true |
| 角色 | packages/server/weiran-system/weiran-system-adapter/src/main/java/com/wulicode/weiran/system/adapter/web/RoleController.java:45、77、105 | 分页/详情，资料 version 与菜单授权 version 分离；assignMenus 全量覆盖 |
| 字典 | packages/server/weiran-system/weiran-system-adapter/src/main/java/com/wulicode/weiran/platform/adapter/web/DictController.java:46、96、104 | 字典与项分别管理，按编码只读启用项，父级删除级联 |
| 用户/菜单 | 同 system/adapter/web/UserController.java:55、100、115；MenuController.java:38、60 | 用户分页/详情和更新；菜单树/详情及版本化更新；必须使用现有 DTO |
| 配置/日志 | platform/adapter/web/ConfigController.java:46、70、115；OperationLogController.java:31 | 配置分组/条目生命周期、两类日志只读；操作日志异步，不能假设立即出现 |
| 地区 | packages/server/weiran-region/weiran-region-adapter/src/main/java/com/wulicode/weiran/region/adapter/web/RegionController.java:47、57、66；PublicRegionController.java:23 | 后台 tree/list 需 region:list；登录 lookup 无管理权限；公开树匿名可读，list 返回数组不分页 |
| 业务约束回归 | packages/server/weiran-app/src/test/java/com/wulicode/weiran/app/PlatformIT.java:25；TreeIT.java:25；UserRoleIT.java:487 | 重复 100003、非法状态/树关系 100004 等已有 Java 测试；本次补外部 HTTP 流程 |

## 可复用点

| 可复用对象 | 位置 | 复用方式 | 需要改造吗 |
|---|---|---|---|
| sessionRequest / principalFromState / rememberSession / closeTrackedSession | tests/framework/session.mjs | API fixture 调用，不新造 Cookie 解析器 | 否 |
| attachState | tests/support/helpers/evidence.ts | 只附断言结果、数量和测试资源标识 | 否 |
| CLI 注册/发现/严格复核 | tests/framework | 8 条声明和 expectedCases、步骤/inputs登记 | 核心不改，仅回归更新注册数量假设 |
| Node 单测 + 合成 HTTP | tests/unit、framework/browser | 新协议装配测试与现有回归并存 | 新增业务场景，不将替身当业务通过 |

## 真实约束

| 约束 | 证据位置 | 对设计的影响 |
|---|---|---|
| 专用凭据与数字 code/Cookie | AGENTS.md、session.mjs | 不默认种子密码；自动 trace关闭，不输出响应中的敏感数据 |
| 版本化更新 | RoleController.java:80、108；UserController.java:118；MenuController.java:63 | 更新先读当前 version；冲突验证不能覆盖正确的新状态 |
| 内置数据保护与关联删除 | PlatformIT.java:25；UserRoleIT.java:487；TreeIT.java:25 | 仅新建普通资源；逆序删关联，绝不拿既有内置行尝试写操作 |
| 资源创建响应可能丢失 | HTTP 客观边界 | 写前记录唯一身份与意图，响应不确定时精确查找同一创建意图；无法确认所有权则失败保留清单 |
| 异步审计 | PlatformIT | 日志读取不要求清空、固定数量或立即落库；不删除审计 |
| 地区能力为下游模块 | AGENTS.biz.md | 新地区流程独立，不将 region DTO/路径耦合进核心共享断言；不改任何上游/下游生产模块 |

## 影响面

### 普通改动

| 文件/模块 | 动作 |
|---|---|
| tests/support/{fixtures,helpers,steps} | API 会话装配、响应断言、私有资源登记/清理、新共享业务步骤 |
| tests/api/system/*、tests/api/region/* | 新 8 条工作流及计划；扩充匿名鉴权 |
| tests/unit、tests/framework/unit | 新业务负例及适配注册数量假设 |
| tests/registry.json、support/steps/INDEX.md | 串行登记新用例 |
| tests/docs、docs/testing.md、state/bizs/artifact.md | 更新覆盖、运行/恢复命令和结果边界 |
| package.json | 如需私有清理入口，只新增独立 test:api:cleanup 命令，不改原 test:api 语义 |

### 共享层命中

#### 桶文件 / 注册表

| ID | 文件 | 冲突原因 | 是否命中 · 预计改动 |
|---|---|---|---|
| SL-1 | settings.gradle.kts | 模块发现单点 | 未命中，不新增模块 |
| SL-2 | weiran-dependencies/build.gradle.kts | BOM/坐标单点 | 未命中，不新增依赖 |
| SL-3 | weiran-app/build.gradle.kts | 装配/聚合单点 | 未命中，不改应用构建 |
| SL-4 | Flyway 种子菜单 | 全局菜单/权限 | 未命中，不追加发布资源；测试菜单由现有 API 自动分配 ID |
| SL-5 | pages/** 和 page-registry.ts | 菜单/页面配对 | 未命中，不新增页面；临时菜单采用目录/按钮类型 |

#### 跨模块契约

| ID | 文件 | 冲突原因 | 是否命中 · 预计改动 |
|---|---|---|---|
| SL-6 | CommonErrors.java | 数字错误码公共契约 | 未命中，只消费现有错误码 |
| SL-7 | framework/page,response | 响应/分页公共契约 | 未命中生产；测试公共响应断言被多流程消费，作为 Layer 0 先冻结 |

#### 序号型资源

不改 Flyway、菜单种子或登记号段。临时记录由 API 生成 ID，不硬编码菜单 ID。测试 registry、共享步骤索引、API fixture/资源清理协议均被多个流程消费，属于测试 Layer 0，串行完成。
构建约定 build-logic/BOM、自动配置 imports、前端 mocks/App、openspec 守卫均未命中。

### 不会碰的目录

packages/ 全部生产/Java测试、源项目、Flyway、openspec/guards/check/schemas、既有归档、私有真实凭据；本次只新增测试工具/用例与对应文档。

## 对 interview 的反向修正

无业务范围冲突。写入未知结果的恢复必须按唯一身份精确核验，不只依赖收到 ID；该工程约束进入设计，符合既定只清理本次资源的要求。地区 list 实际为数组，禁止套分页断言。

## 风险预警

| 风险 | 触发条件 | 建议应对 |
|---|---|---|
| 删除误伤/清理不完整 | 根据前缀泛匹配或删除失败 | 按私有清单的唯一 key/id/类型/父级核验，逐条逆序验证；失败保留 |
| 权限用例污染管理员 | 给既有角色分配菜单 | 只新建普通角色/用户，引用既有权限定义只读 |
| 敏感响应进入产物 | 断言/请求错误直接打印 payload | 固定错误、白名单状态、自动 trace关闭，哨兵扫描 |
| 合成测试与业务实现一起错 | 只跑 mock | 明确其接线层定位；真实前提不足记录未运行，保留后端门禁 |

## Gate

- [x] 共享层命中已完整列出
- [x] 与 interview 无冲突
- [x] 可复用点已确认
