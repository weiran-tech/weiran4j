# 待办

> 在 verify 阶段被判为「越界扩大、本次不修」的问题登记在这里（技术与业务合并同一份清单）。
> **只写在 verify.md 里等于把它埋了**——那份文件会随 change 归档进 `changes/archive/`，此后没人翻得到。
>
> 每条必须带**症状**：谁会因此拿到错的东西。没有症状的条目无法排优先级。
> 技术问题用 `T-NN` 编号，业务问题用 `B-NN` 编号，同一份索引表，互不干扰。

## 待处理

### T-001 · Gradle 配置缓存被迫关闭

**症状**：冷构建配置阶段慢几秒；所有开发者与 CI 都受影响。

Spotless 的 palantir-java-format 步骤在配置缓存恢复的类加载器里拿不到
`--add-exports` 的模块开放，导致 `IllegalAccessError` 被包成
`palantir-java-format(InvocationTargetException)` 随机报错。
详见 `gradle.properties` 里的实测记录。

**关闭条件**：Spotless 修复配置缓存兼容性，或改用不依赖 javac 内部 API 的格式化器。

暂无业务问题（`B-NN`）。

## 已关闭

以下条目由 **D-008 框架重写（2026-09-26，见 `docs/00-决策记录.md`）** 整体关闭——
它们描述的代码（wuli3 依赖、`pam_*` 表、Ban、`PamService` 等）已不存在：

- ~~T-002 · wuli3 底座依赖本地 Maven 仓库~~ —— 已去掉 wuli3，只依赖 Maven Central。
- ~~T-003 · 登录审计缺失~~ —— 新增 `sys_login_log` 表与 `/api/login-logs`。
- ~~T-004 · 单设备登录约束未实现~~ —— 不再对齐 PHP 行为；令牌吊销改走 `token_version`（宪法 CP-8）。
- ~~T-005 · 登录日志/密码重置端点缺集成测试覆盖~~ —— 旧端点已删除，新端点由 `weiran-app` 集成测试覆盖。
- ~~T-006 · 账号-角色分配 UI 入口未定案~~ —— 定案：用户表单内多选角色（`roleIds`）。
- ~~T-007 · Repository 可空字段写入 NOT NULL 列~~ —— `pam_*` 表已弃用，新表结构由 Flyway 定义。

