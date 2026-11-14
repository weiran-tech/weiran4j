# E5: 实施记录

## 完成的 tasks.md 条目

- 4.1

## 改了什么

Controllers / request DTO / AuthApplicationService / 集成用例

## 为什么这么做

所有密码第一阶段共享准入，锁屏独立；更新请求非空非负版本，角色更新独立 DTO 保证 OpenAPI required。

## 依赖的契约

准入与错误码、version。

## 越界申报

必要连带：既有集成请求工厂按测试读取版本生成请求，缺版本协议测试直接调用底层 call；Cookie 测试显式 version=0。

## 埋的坑 / 遗留

不覆盖通用创建请求幂等或短信/MFA 内存状态，详见 artifact.md#13/#25。所有单元串行，无子代理。

## 自测结果

Cookie CSRF 回归、HTTP 缺版本拒绝、锁屏 429 会话保留和 OpenAPI required 断言通过。 最终命令与结果见 exec/evidence 及 verify。
