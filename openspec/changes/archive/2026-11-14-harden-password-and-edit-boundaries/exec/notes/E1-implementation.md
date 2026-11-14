# E1: 实施记录

## 完成的 tasks.md 条目

- 1.1

## 改了什么

framework CommonErrors / system-api SystemAuthErrors

## 为什么这么做

冻结 100007/409 与 110108/429，复用现有 100006/503；不扩展包络。

## 依赖的契约

框架和认证号段既有注册；无新资源号。

## 越界申报

无越界扩大。

## 埋的坑 / 遗留

不覆盖通用创建请求幂等或短信/MFA 内存状态，详见 artifact.md#13/#25。所有单元串行，无子代理。

## 自测结果

全量 check 与错误码回归通过。 最终命令与结果见 exec/evidence 及 verify。
