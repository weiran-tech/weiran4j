# 用户生命周期与编辑冲突

稳定 ID：system/user-lifecycle。入口：user-lifecycle.spec.ts。期望 1 个完整场景，不 skip、不重试。

## 前提

专用管理账号及已启动 API；数字 code/Cookie/CSRF 按现有契约。写前严格要求 FLOW_ALLOW_WRITE=true。

## 验证

实际步骤见 support/steps/api/identity.ts 的 userLifecycle；HTTP、业务码、状态变化均必须符合现有 Controller/DTO。before-state 为认证与初始业务状态摘要，after-state 为本流程断言结果，cleanup-state 为会话/资源清理结果。

## 清理与恢复

本次资源唯一标记、写前私有登记、逆序精确清理与后置核验；失败保留 tests/.local/api-resources 的0600清单，凭 runId 执行 test:api:cleanup。禁止前缀批删、重发不确定创建或改已有数据。 普通退出不吊销旧 JWT；审计日志保留。

## 限制

离线与合成结果不代表真实业务服务通过；真实账号或服务不足记录未运行。该流程不声称覆盖所有API、角色、MFA/短信/SSO。
