# E1: 权限与设置恢复及 docs 演示

## 完成的 tasks.md 条目

5.1、5.2、5.3、5.4、5.5、6.1、6.2。

## 改了什么

- QueryReadiness / queriesReady 共用必要查询成功、失败和刷新判定，ListFeedback 支持上下文名称。
- RoleMenuSheet 的全选、清空、Tree、保存与处理器共用前置，重试保留有效草稿，成功空权限可保存。
- 安全设置区分首次加载与失败，缓存刷新失败保留设置及抽屉草稿；上传规则与配置列表分别重试，保留上传草稿。
- 三种角色 mutation 的成功回调保留角色资源失效，使用 Promise.all 并行失效当前资料与菜单；失败不触发失效。
- docs 四个本地场景共用实际 QueryReadiness、queriesReady 与 Permission；Vue/React root 卸载、重试定时器均清理。
- AGENTS.md 明确演示归属，登记公共组件，更新角色/配置现状并关闭三条待办。

## 为什么这么做

共用无请求的读取状态和权限组件，避免文档再复制一套保护条件。保留已有页面结构和 Query 生命周期，不清空全部缓存，不整页刷新。放弃以数组长度判断就绪，因为真实空权限是合法操作。docs 不装新项目依赖，不替换全局 fetch，不调用业务服务。

## 依赖的契约

使用原有 Query 数据/isSuccess/isError/isFetching/refetch 与既有 HTTP DTO；authKeys.me/menus 使用前缀匹配含会话后缀的实际键。

## 越界申报

无新增越界，改动均在 plan 文件归属内。已有 artifact.md#22、sys_user.md#11 审查待办保留；原有 sys_task、部署手册和批处理迁移未修改。

## 埋的坑 / 遗留

上传配置逐项写入仍可能部分成功（sys_config.md#05）；不在本轮原子性改造范围。身份主动刷新仅覆盖本会话发起的角色变更。历史全部演示未迁移，本轮同步新增涉及场景。

## 自测结果

- 19 个新增回归，覆盖权限分别失败/延迟/刷新失败/草稿/空权限、设置重试与草稿、四类角色写入成功及失败。
- 完整 project.json build/test/lint 全部 exit 0；前端 48 文件、363 用例通过。后端 JDK 21，先 spotlessApply，原有缓存命中任务由 Gradle 标记 UP-TO-DATE。
- docs 构建成功；Chromium 实际验证四个场景、两个上传依赖分别失败、空权限保存、失败写入保留身份与成功同步；业务请求 0、页面脚本错误 0、390px 无水平溢出。桌面1440px与移动390px截图检查正常。
- 内置 CUA 连接不可用，改用本机 headless Chromium 和临时 Playwright 完成验证，未增加仓库依赖。
