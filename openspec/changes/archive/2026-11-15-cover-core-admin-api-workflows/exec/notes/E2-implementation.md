# E2: 核心读取、地区和匿名矩阵

## 完成的 tasks.md 条目

- 2.1

## 改了什么

| 文件 | 动作 | 说明 |
|---|---|---|
| tests/support/steps/api/read.ts、api/system/core-read、api/region/read、system/access-boundary.ts及spec、tests/unit/api-read.test.mjs | 新增/适配 | 核心读取、地区和匿名矩阵 |

## 为什么这么做

- 分页按实际PageQuery归一化，字段形状/非数字code/空数组/树与详情分别断言；日志响应不附证据。地区parentCode与普通parentId树独立；匿名矩阵由3扩到10个请求。
- 放弃：修改种子或已有数据凑测试、直接SQL清理、输出原始业务响应、重试不确定创建；均违反已批准的数据与证据边界。

## 依赖的契约

- exec/plan.md §4 的协议、API身份、所有权、写入前提与证据契约；不改生产API。

## 越界申报

无未声明必要连带。

## 埋的坑 / 遗留

- 真实专用凭据/明确目标环境未提供，真实业务未运行；合成与真实必须区分。
- 普通logout不吊销旧JWT；操作/登录审计保留。无待处理实现项。

## 自测结果

- 3项步骤正负例通过，错误code/缺total/字段缺失/坏树均失败；匿名接口误放行时不把data或异常code写入证据。
- 统一离线与合成结果最后写入exec/evidence；不把模型正例当成生产正确性的证明。
