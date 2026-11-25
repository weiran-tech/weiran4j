# demo_batch_item 批处理演示结果

## 0. 概要

| 项 | 值 |
| --- | --- |
| 表 | `demo_batch_item` |
| 状态 | 可选 local/test 演示结果表；V202611251510 追加恢复 |
| 展示 | docs `/backoffice-examples`，仅模拟 |

## 1. 列表

可选 weiran-demo 提供按任务分页的真实结果接口；先校验当前用户对任务的访问权。普通生产包不装配。

## 2. 字段与表单

`job_id` 与 `item_no` 组成唯一键；`item_name` 保存 Excel 的 name 或 ZIP 文件路径，`item_value` 保存 Excel 的 value 或文件 SHA-256。

## 3. 动作

local/test 加载 Excel/ZIP 处理器，按任务和项目序号幂等写入；集成测试直接验证同一份处理器。

## 4. 用到的公共组件

通用 `BatchProcessor` 接口与 Semi UI 表格。

## 5. 说明与建议

历史建表及清理迁移保持原文；模块通过新增 db/demo-runtime 迁移恢复表，历史 db/app-demo 仅由应用提供一次。业务模块应写自己的业务表。

## 6. 已知问题汇总

无。

## 7. changelog

**2026-11-25**

- 恢复并接入可选 weiran-demo，追加 V202611251510；应用集成测试切换为验证真实演示模块，移除重复 Java 夹具。

**2026-11-23**

- `extract-runtime-examples` 删除运行时演示表和接口，迁移保留原文；测试改用仅 test profile 创建的独立夹具表。

**2026-10-24**

- **#02 ✅ P2 演示结果分页展示**
  任务结束后可分页核对全部写入的数据；错误样例用于验证预检失败时业务表为空。

- **#01 ✅ P2 新增演示结果表**
  保存 Excel 导入行和 ZIP 文件摘要，供批处理页面核对。
