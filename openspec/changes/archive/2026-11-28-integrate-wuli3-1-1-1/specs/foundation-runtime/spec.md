## ADDED Requirements

### Requirement: [FR-001] 正式基座制品解析

后端 MUST 使用 GitHub Packages 的 Wuli3 1.1.1 正式制品。仓库 MUST 限定 com.wulicode.wuli3 group；凭据 MUST 由外部注入，不进入源码、日志或镜像层。构建 MUST NOT 回退到 Maven Local 或同级源码仓库。

#### Scenario: 带认证的正式消费
- **WHEN** 开发者或 CI 提供有效 packages 读取身份
- **THEN** 可解析固定版本 BOM、core 和 MySQL starter；其他第三方依赖仍走既有仓库。
- **判据**: 隔离依赖解析和构建成功，版本为 1.1.1。

### Requirement: [FR-002] 基础设施兼容装配

框架 MUST 复用 core 与 MySQL starter，保持现有数字 code、错误状态、分页、Cookie/CSRF、权限和审计协议。starter MUST 以 implementation 引入，不向 domain/api 暴露 Spring；运行时 MUST 只有一套 MyBatis JSQLParser。未部署的中间件 MUST NOT 因接入被强制依赖。

#### Scenario: 现有应用回归
- **WHEN** 应用使用 Wuli3 基础依赖启动
- **THEN** 原有认证与业务接口保持既有协议，现有审计记录和分页查询仍正确。
- **判据**: JDK 21 check、framework/app 集成测试、版本漂移与纯领域编译检查通过。
