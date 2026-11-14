# E9: 实施记录

## 完成的 tasks.md 条目

- 6.2

## 改了什么

workflow-contracts guard / project.json/check.mjs / tests / check.md/CHANGELOG

## 为什么这么做

有限肯定废止断言守卫，否定/历史说明允许；测试用临时原生 change，归档后仍可运行，不依赖当前 change 名。

## 依赖的契约

插件 run/err 契约；提示词源集合。

## 越界申报

必要连带：project.md DS-2 将旧接口目录文档指针纠正为生成 OpenAPI，DS-2 仍管理 API Design，不修改规则 ID 或弱化门禁。

## 埋的坑 / 遗留

不覆盖通用创建请求幂等或短信/MFA 内存状态，详见 artifact.md#13/#25。所有单元串行，无子代理。

## 自测结果

3 个 Node 测试通过，包含逐源错误夹具、实际 CLI 注入回退；OpenSpec 全量通过。 最终命令与结果见 exec/evidence 及 verify。
