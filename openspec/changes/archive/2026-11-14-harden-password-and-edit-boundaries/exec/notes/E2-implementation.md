# E2: 实施记录

## 完成的 tasks.md 条目

- 2.1

## 改了什么

system-api/domain 视图、命令和仓储端口

## 为什么这么做

独立 version 与原子准入端口；本人用户名通过明确的 updateOwnUsername 定向接口，无管理员版本旁路。

## 依赖的契约

version 与 token_version 独立；纯 Java domain。

## 越界申报

无越界扩大。

## 埋的坑 / 遗留

不覆盖通用创建请求幂等或短信/MFA 内存状态，详见 artifact.md#13/#25。所有单元串行，无子代理。

## 自测结果

Java 编译、领域/应用测试及 OpenAPI schema 断言通过。 最终命令与结果见 exec/evidence 及 verify。
