## Purpose

本能力长期负责「代码合入主分支前,由机器而不是由人的自觉来跑完哪些门禁」:触发时机、必须执行的后端、前端与规格流水线检查,
以及它们运行的工具链版本。它是本仓库门禁 ③,用来兜住本地 pre-commit 钩子被跳过或没安装的情况。

## ADDED Requirements

### Requirement: [FR-001] 持续集成触发时机

仓库 **MUST** 提供 GitHub Actions 工作流,在每个指向 `main` 的 Pull Request 以及每次向 `main` 推送时自动运行。

#### Scenario: PR 与 main 推送都会触发
- **WHEN** 读取 `.github/workflows/ci.yml` 的 `on` 配置
- **THEN** 同时包含 `pull_request`(目标分支 `main`)与 `push`(分支 `main`)
- **判据**:YAML 解析后断言 `on.pull_request.branches` 与 `on.push.branches` 都含 `main`

### Requirement: [FR-002] 持续集成门禁内容

工作流 **MUST** 包含三类检查,任一失败都使整次运行失败:
- 后端:在 JDK 21 上执行 `./gradlew check --no-daemon`,包含基于 Testcontainers 的集成测试;
- 前端:`pnpm lint`、`pnpm test`、`pnpm build`;
- 规格流水线:`node openspec/check.mjs`。

工作流 **MUST NOT** 打开 Gradle 配置缓存。

#### Scenario: 三类检查都在工作流中
- **WHEN** 读取 `.github/workflows/ci.yml` 的各 job 步骤
- **THEN** 能找到 `java-version: 21` 与 `./gradlew check`、`pnpm lint`、`pnpm test`、`pnpm build`、`node openspec/check.mjs`
- **判据**:`grep` 上述字符串在 `ci.yml` 中各至少出现一次,且 `grep -n "configuration-cache" ci.yml` 无匹配

#### Scenario: 工作流语法有效
- **WHEN** 用 `actionlint`(或至少 YAML 解析器)检查 `ci.yml`
- **THEN** 无错误
- **判据**:`actionlint .github/workflows/ci.yml` 退出码为 0;本机没有 actionlint 时退回 `python3 -c "import yaml,sys;yaml.safe_load(open(...))"` 退出码为 0,并在 verify 中注明
