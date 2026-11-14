# sys_authorization_revision

## 0. 概要
本地 RBAC 权限快照在多个实例之间的共享修订号。 system 内部表，无后台菜单。

## 1. 列表
无后台列表；只读排障从请求号、日志及数据库进入。

## 2. 字段与表单
id 固定为 1、revision BIGINT 非负递增；迁移初始化单行。API revision 以十进制字符串输出，避免 JS 精度损失。

## 3. 动作
现有身份/授权缓存失效入口在业务事务中递增 revision；每次本地鉴权先查版本，以 userId/revision 为缓存键。加载与版本使用同一一致性视图，回滚不发布。缺行、不可读或溢出不降级。

## 4. 用到的公共组件
领域端口及 Jdbc 实现由 system 自行装配；前端反馈与交互在 docs/page-states 演示。

## 5. 说明与建议
所有实例同步升级；维护窗口切换。仅通过授权用例维护，不依赖 Redis，也不承担 token_version 的令牌吊销职责。

## 6. 已知问题汇总
无新增待处理项；全局单行适用于后台低频管理写入，未进行大规模吞吐压测。

## 7. changelog
**2026-11-14**

harden-menu-and-authorization-contracts：新增共享一致性边界，历史迁移保持不变。
