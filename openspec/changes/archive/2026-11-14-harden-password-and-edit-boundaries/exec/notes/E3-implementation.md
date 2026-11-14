# E3: 实施记录

## 完成的 tasks.md 条目

- 3.1

## 改了什么

JdbcPasswordAttempts / AuthThrottleProperties / 两份新 Flyway / app yml/env

## 为什么这么做

双桶与硬容量在 guard 短事务内原子预占，数据库 UTC；独立 JdbcTemplate 语句超时 2 秒、事务 3 秒，不改池会话参数；BCrypt 在事务外。

## 依赖的契约

PasswordAttempts；已批准阈值；错误码。

## 越界申报

必要连带：infrastructure/build.gradle.kts 增加本模块 system-api implementation，以引用统一认证错误码；无新第三方版本或反向依赖。

## 埋的坑 / 遗留

不覆盖通用创建请求幂等或短信/MFA 内存状态，详见 artifact.md#13/#25。所有单元串行，无子代理。

## 自测结果

MySQL 双适配器并发、重建、过期、容量、存储故障、锁等待超时和恢复通过。 最终命令与结果见 exec/evidence 及 verify。
