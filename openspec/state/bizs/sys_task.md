# sys_task 批处理任务

## 0. 概要

| 项 | 值 |
| --- | --- |
| 表 | `sys_task` |
| 模块 | `weiran-system` |
| 演示页面 | `/demo/batch`（仅 local/test） |
| 权限 | `system:batch-job:create/list/cancel` |

## 1. 列表

按创建人隔离，可按 `kind` 列表筛选后返回最近 30 个任务，按 ID 倒序。通用工作台只展示配置的处理类型，列表显示文件名、状态和进度。

## 2. 字段与表单

`kind` 标识处理器；`source_key` 是私有文件键或业务引用，`input_mode` 区分两者，`input_fingerprint` 锁定输入内容。托管文件保留期后清空源键。`status` 与 `phase` 分别保存生命周期和五阶段位置；新阶段为 `uploading`、`validating`、`deciding`、`processing`、`summarizing`，历史阶段仍可查询。`total` 是预检识别项数，`selected_count` 与 `decided_at` 固定自动决策，`processed`、`succeeded`、`failed` 是明细投影；`error_message` 是任务级失败原因。`worker` 与 `heartbeat_at` 用于领取及过期恢复；`created_by` 用于查询隔离。

## 3. 动作

上传或业务引用创建、列表与详情查询、协作式取消。同一账号最多同时保留 20 个 `queued`、`running`、`cancel_requested` 任务，创建时锁定用户行；终态任务不计入。worker 原子领取任务，预检每项后持久化完整结果，自动决策后仅处理合格项；处理器可设置每事务 1～100 项，默认逐项提交，批次失败时整批回滚并逐项重试。每项业务数据和成功明细同事务提交。超时重领保留明细和决策，仅处理 `pending` 项；总结时从明细重建计数。任务级输入错误阻止入库。

## 4. 用到的公共组件

`BatchProcessor`、`BatchValidationSink`、`BatchFileStorage`；前端复用 `BatchJobWorkbench`，用 Semi UI Step、表格与进度组件。

## 5. 说明与建议

任务源文件不进入 `sys_media`，完成后保留 7 天；任务和明细继续保留。Excel/ZIP 演示处理器在可选的 `weiran-demo` 模块中。接入方式见 `docs/batch-processing.md`。

## 6. 已知问题汇总

无。

## 7. changelog

**2026-10-31**

- 同账号非终态批处理任务上限由 3 提高到 20。

**2026-10-26**

- **#05 ✅ P1 五阶段与断点恢复**
  任务持久化输入指纹与决策；重领保留明细，从待处理项继续，汇总计数从明细重建。

**2026-10-24**

- **#04 ✅ P2 类型筛选与可复用工作台**
  列表支持按处理类型筛选，前端业务页可配置类型与结果组件。

- **#01 ✅ P2 私有任务输入保留期清理**
  任务完成 7 天后清除源文件对象，任务和明细继续保留。

- **#02 ✅ P2 长耗时项目续租**
  独立线程每 30 秒更新租约。

- **#03 ✅ P2 批处理任务落地**
  新增任务上传、领取、进度、取消及逐项结果入口。
