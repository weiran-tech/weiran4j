# sys_task_detail 批处理逐项结果

## 0. 概要

| 项 | 值 |
| --- | --- |
| 表 | `sys_task_detail` |
| 模块 | `weiran-system` |
| 演示页面 | docs `/backoffice-examples`（本地模拟） |
| 权限 | `system:batch-job:list` |

## 1. 列表

按 `task_id` 隔离，并先检查任务创建人。预检明细排在处理明细之前，按 `item_no` 分页，可筛选阶段和 `pending` / `succeeded` / `failed`。

## 2. 字段与表单

`task_id`、`stage`、`item_no` 唯一标识一项；`stage` 为 `validating` / `processing`；`item_name` 是项标识，`source_location` 可定位单行或多源行，`idempotency_key` 是稳定项键，`display_data` 是最多 2048 字符的脱敏展示信息。`status` 为 `pending` / `succeeded` / `failed`，`message` 是安全的错误摘要；入库成功可保存 `result_type`、`result_id`。历史文件级预检错误 `item_no=0` 仍可查询，新任务级错误记在 `sys_task.error_message`。

## 3. 动作

预检逐项写入全部识别项；自动决策只为通过项插入 `processing/pending`。入库成功或失败仅允许由 `pending` 条件转换，重复回调不得增加计数。任务计数从明细汇总；重领不删除明细。

## 4. 用到的公共组件

`BatchValidationSink`、`PageQuery`、`PageResult`，前端使用 Semi UI 表格。

## 5. 说明与建议

本表是逐项预检和入库结果的唯一来源；业务表只保存目标数据、业务归属或输入关联。接入方式见 `docs/batch-processing.md`。

## 6. 已知问题汇总

无。

## 7. changelog

**2026-11-23**

- `extract-runtime-examples` 将展示迁入 docs，真实后端流程继续由测试夹具验证，运行时移除示例装配。

**2026-10-26**

- **#03 ✅ P1 完整预检和入库结果**
  新增源位置、幂等键、脱敏展示与通用结果引用；所有识别项都有预检记录，决策选中项才有入库记录。

**2026-10-24**

- **#02 ✅ P2 预检错误进入明细**
  增加 `stage`，预检失败按行或文件记录，支持阶段筛选。

- **#01 ✅ P2 新增逐项结果表**
  保存每项成功或失败状态与失败原因，供分页查看。
