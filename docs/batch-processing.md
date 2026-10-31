# 批处理任务

批处理按 **上传 → 预检 → 决策 → 入库 → 总结** 执行。`sys_task` 保存生命周期、决策结论与汇总；`sys_task_detail` 保存所有识别项的预检结果和被选中项的入库结果。业务模块可以保留任务关联及输入文件清单，但逐项处理结果以通用明细为准。

## 生命周期与数量

任务状态为 `queued`、`running`、`cancel_requested`、`succeeded`、`partial_failed`、`failed`、`cancelled`。阶段为 `uploading`、`validating`、`deciding`、`processing`、`summarizing`；历史任务的 `waiting`、`preparing`、`finished` 阶段仍可查询。状态表达排队、运行或终态；阶段表达处理位置，两者不能互相替代。

同一账号最多保留 20 个非终态任务，按 `queued`、`running`、`cancel_requested` 合计；完成、失败或取消后释放名额。创建时锁定用户行，防止并发请求绕过限额。

上传完成后才创建可入队的任务。平台托管文件保存到私有 `batch/YYYYMM/` 对象，任务记录保存 SHA-256。业务引用型任务保存引用和处理器计算的 SHA-256 指纹，不创建占位文件。处理器在恢复及逐项入库前重新校验输入；文件或清单变化时整个任务失败。已完成任务的托管文件保留七天，之后仅清除源文件，任务和明细仍保留。

预检必须识别完整输入，并对每个处理项写一条 `validating` 明细。文件损坏、模板无法识别等任务级异常阻止整个任务入库，此时 `total` 可为 `null`。预检结束后将总项数持久化，进入自动决策。决策只为预检通过的项建立 `processing/pending` 明细；预检失败项不进入入库。`decided_at` 和 `selected_count` 持久化决策结果，恢复时只执行待处理项。

每个业务项的目标数据、业务幂等关联和 `processing/succeeded` 在同一个数据库事务提交。处理器若写入其他存储，必须以 `(taskId, itemNo)` 或稳定幂等键实现等效恢复。成功记录可带 `result_type`、`result_id`；失败记录保留安全的错误摘要。任务级异常和取消分别得到 `failed`、`cancelled` 终态。正常总结先从明细重建计数，未完成项或预检明细数不等于 `total` 时拒绝成功终结。

数量口径：`total` 为预检识别项数；`failed` 包含预检失败与入库失败；`succeeded` 为入库成功；`processed = succeeded + failed ≤ total`。所有项成功为 `succeeded`；成功与失败并存为 `partial_failed`；没有成功且有失败为 `failed`。无处理项且无错误的空输入得到 `succeeded`。

## 接入处理器

业务模块只依赖 `weiran-system-api`，实现 `BatchProcessor` 并注册为 Spring Bean。创建任务时会检查 `kind()` 是否已注册并调用 `authorize(userId)`。

- 平台文件处理器使用默认的 `inputMode() == MANAGED_FILE`，通过现有 multipart 创建接口上传。`extension()` 和 `maxBytes()` 约束文件。
- 业务引用处理器返回 `inputMode() == REFERENCE`，在业务事务内先保存不可变的文件清单或归属关系，再调用 `BatchJobService.createReference(kind, name, reference, userId)`。`referenceFingerprint(reference)` 必须覆盖清单及其指向的内容，返回 64 位 SHA-256；`BatchSource.reference()` 向处理器提供引用，无需单一文件流。
- `precheck(source, sink)` 扫描全部输入。每个 `BatchValidationItem` 提供稳定正整数 `itemNo`、显示名、源位置、稳定幂等键、通过或失败、可选安全错误摘要及最多 2048 字符的脱敏展示数据。团体作品可用一个项编号，源位置描述多行范围。展示数据不是重做入库的权威输入。
- `processItem(source, taskId, itemNo, idempotencyKey)` 只会对决策选中的项调用。处理器重新从不可变输入按编号定位，使用持久化的幂等键写入目标数据，并可返回通用结果引用。可继续的项级失败抛 `BatchFileException` 供查看；其他异常会成为安全的通用项级错误。处理器不得自行写 `sys_task_detail` 或任务计数。

worker 在两项之间检查取消；超时重领保留所有明细和决策，只继续 `processing/pending` 项。明细唯一键为 `(task_id, stage, item_no)`；结果状态只能从 `pending` 转为 `succeeded` 或 `failed`，更新受影响行数必须为一。重复回调不会增加计数。

## 查询与前端

`BatchJobService.get(id, userId)`、`recent(userId, kinds)` 和 `details(id, userId, stage, status, page)` 负责创建者隔离。明细支持按 `validating` / `processing` 和 `pending` / `succeeded` / `failed` 分页。业务接口应先验证任务归属和业务权限，再按 `sys_task.id` 查询通用结果。

通用 HTTP 接口由 Springdoc OpenAPI 描述：`/api-backend/system/batchJob/**` 提供文件创建、任务查询、取消和明细分页；业务引用型创建由业务模块调用 Java 服务。前端 `BatchJobWorkbench` 展示五阶段及三类计数。演示模块的 Excel、ZIP 处理器仅在 local/test 装配；下游可以省略整个 `weiran-demo` 模块。

演示 Excel 的 `name/value` 空值或超长是单项预检失败，其他行继续入库；ZIP 的不支持类型是单项失败，损坏或超过解压限制则是任务级失败。演示业务表 `demo_batch_item` 是目标数据，不是逐项结果表。
