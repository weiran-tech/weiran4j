## MODIFIED Requirements

### Requirement: [FR-002] 持续集成门禁内容

工作流 **MUST** 至少包含以下检查,任一失败都使整次运行失败:
- 后端:在 JDK 21 上执行 `./gradlew check --no-daemon`,包含基于 Testcontainers 的集成测试;
- 前端:`pnpm lint`、`pnpm test`、`pnpm build`;
- 规格流水线:`node openspec/check.mjs`;
- 测试工作流:在 Node 24 上执行不需要真实业务账号或服务的 `pnpm test:flows:check`。

工作流 **MUST NOT** 打开 Gradle 配置缓存。

#### Scenario: 三类检查都在工作流中
- **WHEN** 读取 `.github/workflows/ci.yml` 的各 job 步骤
- **THEN** 能找到 `java-version: 21` 与 `./gradlew check`、`pnpm lint`、`pnpm test`、`pnpm build`、`node openspec/check.mjs`
- **判据**:`grep` 上述字符串在 `ci.yml` 中各至少出现一次,且 `grep -n "configuration-cache" ci.yml` 无匹配

#### Scenario: 工作流语法有效
- **WHEN** 用 `actionlint`(或至少 YAML 解析器)检查 `ci.yml`
- **THEN** 无错误
- **判据**:`actionlint .github/workflows/ci.yml` 退出码为 0;本机没有 actionlint 时退回 `python3 -c "import yaml,sys;yaml.safe_load(open(...))"` 退出码为 0,并在 verify 中注明

#### Scenario: 测试流程离线检查纳入 CI
- **WHEN** PR 或 main 推送触发工作流
- **THEN** 独立测试流程 job 在 Node 24 上安装根依赖并执行 test:flows:check，无需凭据或启动业务服务，失败使 CI 失败
- **判据**:解析工作流步骤可找到对应命令与 Node 24；在无业务服务的干净环境运行该命令退出码为 0。
