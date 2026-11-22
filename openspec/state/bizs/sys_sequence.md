# sys_sequence 自增序号

## 0. 概要

| 项 | 值 |
| --- | --- |
| 表 | `sys_sequence` |
| 模块 | `weiran-system` |
| 对外能力 | `SequenceService.next(type)` |
| 演示页面 | docs `/backoffice-examples`（本地模拟；真实语义由后端测试验证） |

## 1. 列表

当前没有管理列表页；每种类型在表中只有一行。可选 demo 页面用于手动分配和观察返回值。

## 2. 字段与表单

`id` 为类型计数器的自增主键，`type` 为唯一业务分类，`sequence` 为该分类当前序号，从 1 开始。相同类型的多次分配返回相同 `id`，但 `sequence` 不同。

## 3. 动作

`SequenceService.next(type)` 在独立事务中原子递增该类型计数器，返回 `id/type/sequence`。无删除或重置接口。

## 4. 用到的公共组件

无。

## 5. 说明与建议

业务唯一键应使用 `(type, sequence)`，不能仅使用 `id` 或 `sequence`。外层业务回滚不会重用已分配序号，空缺是正常现象。接入说明见 `docs/sequence.md`。

## 6. 已知问题汇总

无。

## 7. changelog

**2026-11-23**

- `extract-runtime-examples` 将展示迁入 docs，真实后端流程继续由测试夹具验证，运行时移除示例装配。

**2026-10-24**

- **#01 ✅ P2 分类型自增序号能力**
  新增单表计数器，对外提供独立事务中的原子序号分配。
