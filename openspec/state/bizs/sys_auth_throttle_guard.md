# sys_auth_throttle_guard

## 0. 概要
认证计数事务协调与总键数，属于 system 基座内部实现，无管理菜单。

## 1. 列表
无后台列表；排障从聚合日志及数据库只读查询进入。

## 2. 字段与表单
id 固定为 1、tracked_keys 非负；Flyway 初始化单行，所有桶增删与该字段同事务。无业务表单，不保存密码、令牌或原始账号/IP。

## 3. 动作
SELECT FOR UPDATE 协调短事务；清理过期桶并维护总数，达到容量不驱逐活跃计数。存储/容量失败拒绝继续密码比较，不随外层登录失败回滚。

## 4. 用到的公共组件
JdbcPasswordAttempts、AuthThrottleProperties 与 domain PasswordAttempts；前端反馈演示位于 docs/page-states。

## 5. 说明与建议
所有实例使用相同配置；成功尝试也计数。数据库 UTC 时间计算窗口，重启不重置；单 guard 串行只包含计数操作，BCrypt 在事务外。过期清理有界，非通用分布式限流平台。

## 6. 已知问题汇总
无新增待处理条目；大规模吞吐尚未压测，不据此声称可承载任意并发。

## 7. changelog
**2026-11-14**

harden-password-and-edit-boundaries：新增共享计数持久化和保护边界。
