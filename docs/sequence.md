# 自增序号

业务模块注入 `weiran-system-api` 的 `SequenceService`，调用 `next(type)` 获取 `SequenceValue(id, type, sequence)`。不同业务用途使用不同 `type`。`type` 必须以小写字母开头，只能包含小写字母、数字、下划线和短横线，最长 64 位。

`sys_sequence` 每种类型只保存一行。`id` 是该类型计数器的自增主键，**同类型的后续调用返回同一个 `id`**；`sequence` 从 1 开始，每次调用加 1。例如连续调用 `next("order")`，可得到 `{id: 15, type: "order", sequence: 1}`、`{id: 15, type: "order", sequence: 2}`。另一个类型从自己的 1 开始。

业务记录的唯一性使用 **`(type, sequence)`**，不能只用 `id` 或 `sequence`。计数器表的 `type` 唯一索引与 MySQL 行锁保证并发递增；业务表仍应对保存的业务标识建立唯一索引。

每次 `next` 使用独立事务提交。即使外层业务回滚，已发出的序号也不会重用，因此序号可能有空缺。它不表示业务记录已经创建，也不能代替幂等请求键。

在[后台页面示例](/backoffice-examples)中选择“自增序号”，可查看本地模拟递增和不同类型独立计数。真实数据库递增、并发与回滚语义继续由后端测试验证；应用不提供示例 HTTP 接口。

```java
private final SequenceService sequences;

public OrderApplicationService(SequenceService sequences) {
    this.sequences = sequences;
}

public void create() {
    SequenceValue value = this.sequences.next("order");
    // 将 value.type() 与 value.sequence() 一起保存到业务表。
}
```
