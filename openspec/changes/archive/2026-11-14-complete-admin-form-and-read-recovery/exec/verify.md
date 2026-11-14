---
title: "后台编辑保护与读取恢复验收"
status: "ready"
updated_at: "2026-11-14"
---

# Verify

# 一、集成记录(L6)

单执行单元 E1，单工作区，无并行集成。已读 exec/notes/E1-frontend.md。

## 输入检查

- [x] 执行笔记齐全
- [x] 共享层零修改，既有前端契约保持不变
- [x] 自测与完整验证通过

## 重复实现消除

复用已有 useFormCloseGuard、ListFeedback、ListEmptyState、QueryReadiness；未新增重复状态框架。OperationLogDetails 从原内嵌详情中提取，页面和 docs 共用；prettyBody 仍从原页面 re-export，既有调用保持兼容。

## 被牺牲的方案

不扩大 NavListPanel 的 emptyText（string）协议，不修改 semi-components：用原有文本空态与 footer 清空入口实现字典主栏成功无结果；失败反馈在区域外组合。放弃全局 CSS 修改，字典布局修正限定本页。

## 越界修改汇总

| 文件 | 申报单元 | 性质 | 处置 |
|---|---|---|---|
| hooks/__tests__/useTableDefaults.test.tsx | E1 | 必要连带：角色成功空态文案变化，原分页偏好测试需等待新文案 | 保留，分页与请求断言不变 |
| pages/system/dicts/dicts.css | E1 | 必要连带：浏览器发现窄屏裁切，影响新增刷新入口可达性 | 保留，局部 min-width 与头部换行 |

没有越界扩大；无关 sys_task、后端部署文档和兼容迁移保持原状，不计入本次实现。

# 二、规格一致性(L8)

## 前置条件:L7 硬闸门

执行命令由 project.json commands 实际读取，全部为最终源码修改后的真实输出。先执行 JDK 21 spotlessApply，再串行运行 Gradle 门禁；无 clean，无并发 Gradle，无 stash。后端增量任务 UP-TO-DATE 为真实执行结果，无伪造测试次数。

| 检查 | 命令 | 结果 | 证据 |
|---|---|---|---|
| build | `(cd packages/server && JAVA_HOME=${JAVA_HOME_21:-$(/usr/libexec/java_home -v 21)} ./gradlew assemble --no-daemon) && pnpm --filter @weiran/manage build` | ☑ 绿，退出 0 | `evidence/build.log` |
| test | `(cd packages/server && JAVA_HOME=${JAVA_HOME_21:-$(/usr/libexec/java_home -v 21)} ./gradlew test --no-daemon) && pnpm --filter @weiran/manage test` | ☑ 绿，退出 0 | `evidence/test.log` |
| lint | `(cd packages/server && JAVA_HOME=${JAVA_HOME_21:-$(/usr/libexec/java_home -v 21)} ./gradlew check --no-daemon) && pnpm --filter @weiran/manage lint` | ☑ 绿，退出 0 | `evidence/lint.log` |

前端最终 52 个测试文件、428 项通过（基线 379，本次增加 49）。针对性 52 项通过。docs 最终构建退出 0，@weiran/docs 为 cache miss；证据 docs.log。真实 Chromium 验证结果为 docs-browser.json、manage-browser.json：三类 docs 场景、六个列表示例、编辑草稿与保存互斥、详情恢复通过；业务请求 0、未捕获异常 0。实际字典左右独立恢复及缓存保留通过；390px 下刷新和新增按钮在视口内，无文档横向溢出，桌面与窄屏截图已视觉检查。

## tasks.md 逐条核对

| 条目 | 单元 | 实现与验证 | 一致 |
|---|---|---|---|
| 5.1 | E1 | 三个表单文件覆盖四类弹窗，AdminFormProtection 24 项 | ☑ |
| 5.2 | E1 | RolesPage、MenusPage、DictsPage 两侧、两类日志列表，ReadRecovery | ☑ |
| 5.3 | E1 | OperationLogDetails 及实际操作日志页的同 ID 恢复测试 | ☑ |
| 5.4 | E1 | docs 三类演示、组件登记和六份现状文档 | ☑ |
| 6.1 | E1 | 新增 49 项；既有偏好等待文案同步；完整 428 项通过 | ☑ |
| 6.2 | E1 | 最终三门禁、docs 构建、桌面与390px浏览器验收 | ☑ |
| 6.3 | E1 | 真浏览器发现并修正字典 grid 最小宽度和头部裁切，最终坐标断言与截图通过 | ☑ |

未实现条目：无。

## design.md 一致性

| 范围 | 实现 | 一致 |
|---|---|---|
| 编辑保护 | 取消/关闭/Esc 统一 guard；校验与保存互斥；失败保留，成功直接关闭 | ☑ |
| 列表恢复 | 状态优先于数组长度；成功空缓存也可识别；重试只 refetch，保留分页和筛选 | ☑ |
| 字典主从 | 分别处理左右查询；首次主列表失败不显示请选择字典；缓存主列表和当前项保留 | ☑ |
| 详情恢复 | QueryReadiness 与可用 data 分别渲染，无无限 Spin；保留原字段及请求体格式化 | ☑ |
| API/Database/装配/权限 | 后端、协议、迁移、权限与路由未修改 | ☑ |
| Observability | 显式错误、等待与重试；无原始异常和草稿日志 | ☑ |
| docs | 纯本地数据与实际公共逻辑复用，无账号依赖 | ☑ |

## specs 验收标准核对

| AC / spec / Scenario | 验证方式 | 通过 |
|---|---|---|
| AC-1 / FR-015 有改动时继续编辑或放弃、无实际改动时直接关闭、后台编辑弹窗保护一致 | 四类真实 Semi Form 分别覆盖初值、改回、取消、关闭、Esc、继续和放弃 | ☑ |
| AC-2 / FR-015 保存期间和保存结果保护、后台编辑弹窗保护一致 | 同事件循环重复点击与可控请求，等待期间保存/取消禁用，无关闭入口，失败保留，成功关闭无确认；浏览器验证 docs 延迟保存 | ☑ |
| AC-3 / FR-014 首次查询失败后重试成功、后台刷新失败保留已有数据、后台列表采用一致查询反馈 | 六类实际页面逐类注入首次失败、恢复、缓存刷新失败，检查原参数及旧数据 | ☑ |
| AC-4 / FR-014 空结果与查询条件对应、字典主从查询分别恢复 | 六类成功空态、四个搜索列表清空回第一页、菜单手动收起后重试仍收起、字典左右分别恢复 | ☑ |
| AC-5 / FR-020 详情首次失败后重试恢复、详情缓存刷新失败 | 实际操作日志页点击详情，首次失败无加载，重试只请求 ID42；缓存详情字段保持并可恢复 | ☑ |
| AC-6 / FR-018 文档站切换并恢复页面状态、编辑与查询恢复演示 | 既有场景保留；新三类最终构建产物由 Chromium 操作并确认无业务请求；完整门禁绿 | ☑ |

原有用户列表与用户编辑场景由完整测试继续验证；本次 delta 保留原需求与场景标题，无需求删除或标题漂移。

## 越界检查

实际变更集与 plan 拥有路径、notes 的两项必要连带对照，无未申报越界。未跟踪新增的日志测试、纯呈现组件、docs 支持文件均属于 E1 已声明范围；sys_task、部署说明与兼容迁移为进入本次前已有的无关修改。

## 不一致项归属判定

| 内容 | 判定 | 处置 |
|---|---|---|
| 字典在390px下工具区被裁切，文档无横向溢出仍会漏掉此问题 | 代码缺陷，验收阶段发现 | 新增6.3，在本页局部 CSS 修正；坐标断言确认按钮可达；重跑最终三门禁与docs |
| NavListPanel emptyText 只收 string | 实现需适配既有协议，设计意图不变 | 保留文本空态，清空操作放footer，未改变共享协议 |
| 旧偏好回归等待“暂无数据” | 旧测试等待文案需随本次成功空态更新 | 等待“暂无记录”，分页断言不变 |
| 浏览器脚本的 Modal 按钮名称与连续保存 | 验收定位与节奏问题 | 采用实际 cancel/confirm 可访问名称并明确确认框作用域；尊重 Semi 内置100ms去抖，未改业务保护 |
| docs 重建期间复用预览进程 | 验证环境缓存旧资源清单 | 重启预览后对最终产物重跑，交互与资源加载通过 |

上述均未改变已批准设计意图，无需重开规格；已执行修复后的验证。

## 遗留问题

无本次目标内未解决项。既有 sys_role.md#02、sys_group.md#02 的内置状态选项、其他表单保护不属于本次范围，保留现有待办；未新增未登记的产品缺陷。已将 artifact.md#23/#24、sys_login_log.md#04、sys_operation_log.md#07 整条移入 changelog，编号保留并标明本 change。

## 流程反馈

无共享层或并行分层缺陷。验证追加6.3由单单元E1处理，L4映射守卫为硬性检查，因此在任务映射章节注明回指本文件，不虚构新执行单元。

## 结论

- [x] 集成完成，越界汇总已写
- [x] L7三项全绿
- [x] tasks全部覆盖
- [x] design/specs一致
- [x] 无未申报越界
- [x] 不一致项已处置

**判定**：通过，进入L9人类审阅diff。

## L9 审阅记录

用户于 2026-11-14 回复「归档」，批准本次最终变更归档。
