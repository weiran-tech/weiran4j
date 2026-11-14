# 地区公开与后台只读契约

稳定 ID：region/read。入口：read.spec.ts。期望 1 个完整场景，不 skip、不重试。

## 前提

专用管理账号及已启动 API；数字 code/Cookie/CSRF 按现有契约。无需浏览器。

## 验证

实际步骤见 support/steps/api/read.ts 的 readRegions；HTTP、业务码、状态变化均必须符合现有 Controller/DTO。before-state 为认证与初始业务状态摘要，after-state 为本流程断言结果，cleanup-state 为会话/资源清理结果。

## 清理与恢复

仅清理自建会话，不删除借用缓存。 普通退出不吊销旧 JWT；审计日志保留。

## 限制

离线与合成结果不代表真实业务服务通过；真实账号或服务不足记录未运行。该流程不声称覆盖所有API、角色、MFA/短信/SSO。
