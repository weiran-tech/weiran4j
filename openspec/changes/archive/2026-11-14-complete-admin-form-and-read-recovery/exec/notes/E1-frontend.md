# E1: 后台编辑保护与读取恢复

## 完成的 tasks.md 条目

5.1、5.2、5.3、5.4、6.1 已完成；6.2、6.3 已完成完整门禁、最终 docs 和实际字典浏览器验收；结果见 verify。

## 改了什么

| 文件 | 动作 | 说明 |
|---|---|---|
| 四类实际表单（三个文件） | 改造 | 复用 guard，校验和保存整个阶段互斥，用户主动关闭须比较草稿 |
| 六类列表（五个文件） | 改造 | 失败与空态分离，缓存失败保留数据，重试沿用 key |
| components/OperationLogDetails.tsx | 新增 | 提取原详情字段与 prettyBody，组合 QueryReadiness，纯呈现供 docs 复用 |
| docs/.vitepress/theme/AdminRecoveryDemos.tsx、PageStateDemoReact.tsx、page-states.md | 改造 | 新增三类本地交互示例，无真实 HTTP hook |
| pages/system/roles/__tests__/AdminFormProtection.test.tsx | 新增 | 四类真实弹窗 24 项回归 |
| pages/logs/__tests__/ReadRecovery.test.tsx | 新增 | 六类列表、筛选重置、树展开保留及详情共 25 项回归 |
| 组件登记与六份 state | 更新 | 登记实际组件，关闭四个已知问题并更新现状 |

## 为什么这么做

- 复用已有 guard、ListFeedback、ListEmptyState、QueryReadiness，未引入另一套状态框架。
- NavListPanel 的 emptyText 实际是 string，故保留原有公共协议，错误时空字符串、成功显示对应文本，筛选清空操作放 footer；不为本页扩大共享组件协议。
- 用户主动关闭走 requestClose，成功保存直接 onClose，失败不重建表单。
- 日志详情字段与格式化保持一致，prettyBody 在原页面继续 re-export，既有消费者不受影响。

## 依赖的契约

按 plan 第 4 节消费四项现有协议，未改任何协议。docs 仅导入实际 guard、查询呈现和详情组件，无业务请求。

## 越界申报

| 文件 | 为什么不得不改 | 性质 | 其他单元影响 |
|---|---|---|---|
| hooks/__tests__/useTableDefaults.test.tsx | 角色列表成功空态由默认“暂无数据”变为显式“暂无记录”，同步已有偏好测试的等待文案；分页偏好断言保持不变 | 必要连带 | 无 |
| pages/system/dicts/dicts.css | 真浏览器 390px 验证发现 grid 子项最小宽度导致标题、刷新操作被裁切；本页局部收缩、标题换行与操作换行，不改全站样式 | 必要连带 | 无 |

## 埋的坑 / 遗留

- Semi Modal 内置 100ms leading debounce，浏览器连续两次保存需等待其恢复，不将被去抖的点击误当作新请求。
- 本次不扩展其他表单的关闭保护；P3 内置角色/字典状态选项仍按既有待办保留。
- 无关 sys_task、部署说明和兼容迁移保持原样。

## 自测结果

- 针对性 52 项通过（24 新弹窗、25 新读取、3 既有偏好）；前端完整最终 52 个测试文件、428 项通过。
- 首轮 build/test/lint 全绿；验证发现字典局部布局后，最终 build/test/lint 已重新执行且全绿。
- 浏览器实际字典主/从错误恢复、缓存保留和草稿保留已验证；最终布局与 docs 结果以 verify 及 evidence 为准。
