---
title: "后台交互恢复验收"
status: "ready"
updated_at: "2026-11-14"
---

# Verify

## 一、集成记录(L6)

单执行单元，无并行集成。E1 收尾笔记已阅读，任务全部完成，HTTP 与权限契约无变化。

### 越界修改汇总

| 文件 | 申报单元 | 性质 | 处置 |
|---|---|---|---|
| AGENTS.biz.md | E1 | 必要连带：新增下游组件清单需要规则读取入口 | 保留，已在 notes 申报 |
| 临时 .kaizen-review.html / .tsx | E1 | 浏览器验收辅助文件 | 已删除，临时服务已停止 |
| sys_task.md、02-部署.md、既有批处理兼容迁移 | 原有工作区改动 | 与本 change 无关，用户确认其他会话暂停 | 全程原样保留，不纳入本 change 实现 |

## 二、规格一致性(L8)

### 前置条件：L7 硬闸门

JDK 21 下先执行 spotlessApply 成功，再按 project.json 的 commands 串行执行以下三项。最终日志均晚于最后一次源码修改，无 stash 操作；Gradle 多数任务复用 up-to-date 结果，未修改后端代码。

| 检查 | 命令 | 结果 | 证据 |
|---|---|---|---|
| build | `(cd packages/server && JAVA_HOME=${JAVA_HOME_21:-$(/usr/libexec/java_home -v 21)} ./gradlew assemble --no-daemon) && pnpm --filter @weiran/manage build` | 通过，EXIT_CODE=0 | `evidence/build.log` |
| test | `(cd packages/server && JAVA_HOME=${JAVA_HOME_21:-$(/usr/libexec/java_home -v 21)} ./gradlew test --no-daemon) && pnpm --filter @weiran/manage test` | 通过，EXIT_CODE=0 | `evidence/test.log` |
| lint | `(cd packages/server && JAVA_HOME=${JAVA_HOME_21:-$(/usr/libexec/java_home -v 21)} ./gradlew check --no-daemon) && pnpm --filter @weiran/manage lint` | 通过，EXIT_CODE=0 | `evidence/lint.log` |

- 前端全量：45 个测试文件、344 条测试全部通过。
- 本次直接相关的 3 份测试文件：39 条测试通过。
- git diff --check 通过。
- 两次默认沙箱运行因无法写入 ~/.gradle 的锁文件而提前终止；改用用户已批准的外部缓存访问权限后，最终三份日志均为真实成功输出，不将环境拒绝当作代码失败或跳过门禁。

### tasks.md 逐条核对

| 任务 | 实现与证据 | 结论 |
|---|---|---|
| 1.1 | ListFeedback/ListEmptyState 接入两个列表；失败、刷新失败、重试、两种空态均有交互测试 | 通过 |
| 1.2 | useFormCloseGuard 接入两个新增/编辑弹窗；实际值比较、继续/放弃、保存中锁与保存结果测试 | 通过 |
| 1.3 | 地区默认展开与手动数组分离；三级路径、刷新、重置和重新筛选测试 | 通过 |
| 1.4 | components.biz.md、AGENTS.biz.md 入口与两个模块现状已同步；地区父级选项遗留已登记 | 通过 |
| 2.1 | UsersPage 19 条、RegionsPage 10 条、关闭保护 10 条，合计 39 条 | 通过 |
| 2.2 | JDK 21 spotlessApply、build/test/lint 实际输出与浏览器操作均已完成 | 通过 |

### design/specs 与验收标准核对

| 验收标准 | 对应需求 | 实际验证 | 结论 |
|---|---|---|---|
| AC-1 首次失败重试、刷新失败保留数据 | admin-foundation/FR-014、administrative-regions/FR-006 | 两个列表组件测试；Chrome 失败后重试恢复数据，错误消失 | 通过 |
| AC-2 空态可区分和清空条件 | admin-foundation/FR-014、administrative-regions/FR-006 | 两个列表测试；失败时不存在默认“暂无数据”或“暂无记录” | 通过 |
| AC-3 实际修改关闭确认 | admin-foundation/FR-015、administrative-regions/FR-006 | 两个真实 Semi Form 的无修改、改回初值、继续/放弃测试；Chrome 编辑用户确认后继续编辑保留昵称，关闭按钮同样保护 | 通过 |
| AC-4 保存期间及保存结果 | admin-foundation/FR-015、administrative-regions/FR-006 | 可控延迟请求确认只提交一次，等待期间取消禁用，成功关闭，失败保留输入并恢复关闭确认 | 通过 |
| AC-5 地区筛选展开 | administrative-regions/FR-006 | 三级树交互测试；Chrome 筛选“东城”自动展示县级，全部收起后刷新保持折叠 | 通过 |
| AC-6 门禁与改动隔离 | 全部本次需求 | 最终三份 evidence 均 EXIT_CODE=0；原有三处改动未被修改 | 通过 |

### 浏览器验证范围

- 使用真实 React 页面、Semi 控件与项目样式，通过临时 Vite 入口和本地模拟接口运行；没有连接真实业务库。
- 观察确认弹窗默认焦点位于安全选项“继续编辑”，继续后原输入保留；确认放弃回到列表。
- 已观察列表失败反馈、恢复后的数据，以及地区三级结果布局与刷新折叠状态。
- 未运行真实登录到后端的完整链路；本次没有修改 API、认证和后端，保存中的请求行为由可控网络组件测试覆盖。

### 不一致项归属与处置

- 浏览器发现首次失败仍出现 Semi 默认“暂无数据”，归属实现遗漏而非规格问题。已用显式空 React 节点覆盖默认 empty 回退，并增加断言、重跑最终三项门禁。
- React 检查：无每次数据更新触发自动展开的 effect；无新增依赖或全局事件监听；表单锁用 ref 处理同一事件循环的重复操作，state 控制可见反馈；密码草稿不持久化。
- 无需要重开设计的差异，无未申报越界；待归档的 delta specs 保持为本 change 的规格变更，未提前覆盖主 spec。

## 遗留问题

- 地区编辑父级选项受列表筛选限制：已登记 `region.md#02`，属于已批准的本轮边界之外，不影响本轮三项改进验收。
- 表单关闭保护不包含浏览器刷新和全局路由离开；此边界已在设计和现状说明中明确，未持久化草稿。

## 结论

- [x] 集成完成，单执行单元越界汇总已写
- [x] L7 三项全绿
- [x] tasks.md 全部覆盖
- [x] design/specs 一致
- [x] 无未申报越界
- [x] 不一致项已归属并修复

**判定：通过，进入 L9 人类审阅最终 diff；尚未提交、归档或发布。**

## L9 最终审阅

- 2026-11-14，用户回复「归档」，批准本次最终改动与 OpenSpec 归档；不包含 Git 提交、推送或发布。
