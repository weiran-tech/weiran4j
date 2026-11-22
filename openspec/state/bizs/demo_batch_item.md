# demo_batch_item 批处理演示结果

## 0. 概要

| 项 | 值 |
| --- | --- |
| 表 | `demo_batch_item` |
| 状态 | 已移除；V202611230100 删除旧结果表 |
| 展示 | docs `/backoffice-examples`，仅模拟 |

## 1. 列表

无运行时列表或接口。测试夹具使用独立 `test_batch_item` 表验证结果分页，不进入发布物。

## 2. 字段与表单

`job_id` 与 `item_no` 组成唯一键；`item_name` 保存 Excel 的 name 或 ZIP 文件路径，`item_value` 保存 Excel 的 value 或文件 SHA-256。

## 3. 动作

运行时不再写入。Excel/ZIP 处理器已移入 `weiran-app` 测试源码，写入测试专用表验证幂等与事务。

## 4. 用到的公共组件

通用 `BatchProcessor` 接口与 Semi UI 表格。

## 5. 说明与建议

此文件保留历史表结构说明；旧表已由追加迁移清理，已发布建表迁移原样保留。业务模块应写自己的业务表。

## 6. 已知问题汇总

无。

## 7. changelog

**2026-11-23**

- `extract-runtime-examples` 删除运行时演示表和接口，迁移保留原文；测试改用仅 test profile 创建的独立夹具表。

**2026-10-24**

- **#02 ✅ P2 演示结果分页展示**
  任务结束后可分页核对全部写入的数据；错误样例用于验证预检失败时业务表为空。

- **#01 ✅ P2 新增演示结果表**
  保存 Excel 导入行和 ZIP 文件摘要，供批处理页面核对。
