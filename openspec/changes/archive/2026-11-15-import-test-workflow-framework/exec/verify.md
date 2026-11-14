---
title: "测试工作流迁移验收"
status: "verified"
updated_at: "2026-11-15"
---

# Verify

# 一、集成记录(L6)

**并行方式**：单工作区，无并行集成。
**执行单元数**：6，全部由同一执行者依次完成，无 worktree 或子代理。

## 输入检查

- [x] 已逐份读取 E1～E6 的 `notes/*-implementation.md`。
- [x] Layer 0 已完成；流程、环境、认证、清理、证据契约未改变已批准意图。
- [x] 所有自测与工程门禁通过。

## 重复实现消除

Cookie 解析、请求、身份核验和私有恢复集中在 `framework/session.mjs`；CLI、人工窗口、fixture 和系统步骤共用。系统场景断言集中在 `support/steps/`，spec 仅装配证据。没有复制业务组件或再造产品认证实现；合成服务仅属于测试替身。

## 被牺牲的方案

| 放弃的方案 | 来自 | 放弃理由 |
|---|---|---|
| 原样复制旧 Bearer/localStorage 主体、合同/返利/STS | 源项目 | 当前协议与业务不存在对应能力，会造成虚假覆盖。 |
| 默认种子账号或自动启动真实业务服务 | 迁移便利方案 | 不符合专用账号与操作者提供环境前提。 |
| 旧 JWT 重放被拒作为退出判据 | 旧令牌语义 | 当前普通 logout 仅清 Cookie，不递增 token_version。 |
| 将真实登录或 Chromium 回归塞入普通离线 CI | 工程接入 | 需要账号或浏览器，离线 job 保持独立可运行。 |
| 直接照搬源 Turbo 编排和锁文件 | 源工程 | 保留当前根任务语义，由当前 pnpm 重新解析唯一锁文件。 |

## 越界修改汇总

| 文件 | 申报单元 | 性质 | 处置 |
|---|---|---|---|
| pnpm-workspace.yaml | E1 | 必要连带 | 明确 protobufjs 不执行 postinstall，解决严格安装策略拦截；不放开其他脚本。保留。 |
| tests/unit/{cli,framework,inspect}.test.mjs | E1 | 必要连带 | 源通用回归实际位置，计划所列 framework/unit 为概括；保留原分组，E4 复用。 |

其余变更均位于计划拥有范围。生产 packages/、Java BOM、Flyway、源项目与历史归档没有修改。

# 二、规格一致性(L8)

## 前置条件：L7 硬闸门

命令逐项读取 `openspec/project.json.commands`；以下日志为本次实现完成后串行执行的真实输出。先 JDK21 `spotlessApply --no-daemon`，后 build/test/lint；没有 clean、配置缓存或 stash 操作。

| 检查 | 命令 | 结果 | 证据 |
|---|---|---|---|
| build | `(cd packages/server && JAVA_HOME=${JAVA_HOME_21:-$(/usr/libexec/java_home -v 21)} ./gradlew assemble --no-daemon) && pnpm --filter @weiran/manage build` | ✅ exit 0 | `evidence/build.log` |
| test | `(cd packages/server && JAVA_HOME=${JAVA_HOME_21:-$(/usr/libexec/java_home -v 21)} ./gradlew test --no-daemon) && pnpm --filter @weiran/manage test` | ✅ exit 0 | `evidence/test.log` |
| lint | `(cd packages/server && JAVA_HOME=${JAVA_HOME_21:-$(/usr/libexec/java_home -v 21)} ./gradlew check --no-daemon) && pnpm --filter @weiran/manage lint` | ✅ exit 0 | `evidence/lint.log` |

后端 Gradle assemble/test/check 均成功，大部分任务为 UP-TO-DATE，未宣称所有后端用例重新执行。前端 Vitest 本次实际执行 **56 文件 / 446 测试通过**；前端 build 和 ESLint 通过。无红灯基线豁免。

| 补充检查 | 结果 | 证据 |
|---|---|---|
| pnpm test:flows:check | 类型/发现/注册/Bruno 语法通过；**51 tests，0 fail / skip / cancel** | evidence/flows-check.log |
| pnpm test:flows:browser | **1 个真实 Chromium 综合回归通过**；通过 CLI 实际执行全部 5 条 Playwright 与 2 条 Bruno，均使用随机本地合成服务 | evidence/flows-browser.log |
| pnpm build:docs | 通过 | evidence/docs-build.log |
| pnpm install --frozen-lockfile | 通过 | evidence/frozen-install.log |
| CI YAML | actionlint 不在本机，使用 PyYAML 解析并断言 4 job、Node24 与离线命令，均通过 | evidence/ci-yaml.log |
| 流程发现 | 注册 7 条，原生 Playwright 发现 5 个用例 | evidence/discovery.log |
| OpenSpec / Git | 全量结构检查、strict validate 与 diff --check 通过 | evidence/openspec.log、scope.log |
| 私有材料 | .local/.artifacts 忽略规则验证通过；密码/Cookie 哨兵不进入普通证据，文件权限与链接越界负例通过 | evidence/scope.log、flows-check.log |

Node 原生读取 TS 会输出 MODULE_TYPELESS_PACKAGE_JSON 提示；不影响结果。文档/前端构建保留现有依赖的指令或体积提示，未因此放宽门禁。

## tasks.md 逐条核对

| tasks.md 条目 | 执行单元 | 实现位置 | 一致 |
|---|---|---|---|
| 1.1 | E1 | tests/framework、registry、Playwright/TS 配置、根依赖与忽略规则 | ✅ |
| 1.2 | E2 | batch/process/core/inspect/bruno 与 CLI/报告负例 | ✅ |
| 1.3 | E3 | session/browser/CLI、私有缓存/恢复与 Cookie 负例 | ✅ |
| 2.1 | E4 | api/e2e/bruno、support、unit 与合成 Chromium | ✅ |
| 2.2 | E5 | package.json、ci.yml 独立 Node24 job | ✅ |
| 3.1 | E6 | tests/docs、docs/testing.md、导航、AGENTS/README、artifact 现状 | ✅ |

### 未实现条目

无。真实环境执行受输入前提限制，按设计记录未运行，不属于遗漏的实现任务。

## design.md 一致性

| design 章节 | 设计要求 | 实现情况 | 一致 |
|---|---|---|---|
| Architecture / Data Flow | 统一目录、严格执行、原测试保留、串行迁移 | 根 CLI 与 7 条注册流程，零重试、原始/复核分离 | ✅ |
| Cookie 会话与恢复 | HttpOnly storageState、CSRF、身份/范围核验、私有恢复 | API jar 与浏览器上下文均按实际 Cookie 属性核验；失败恢复/幂等清理负例通过 | ✅ |
| API Design | 数字 code、当前路径、存活/匿名/本人/授权快照 | 系统步骤与 Bruno 已适配；登录表单本身验证密码入口可用，同源请求验证代理 | ✅ |
| Database / 权限 / 分层 | 不改生产/数据库/菜单、保留审计、范围诚实 | packages/ 零改动，无源码项目私有材料，无权限矩阵冒充覆盖 | ✅ |
| 前端 / Observability | docs 入口、安全证据、独立运行记录 | docs 构建通过；敏感用例禁 trace/video/自动截图，白名单状态和非敏感页面截图 | ✅ |
| Test Plan / Rollout | 离线、合成、真实分开；Node24 job；旧门禁 | 离线/合成/旧门禁全绿，真实未运行 | ✅ |

## specs 验收标准核对

| spec / Scenario | 验收标准 | 验证方式 | 通过 |
|---|---|---|---|
| test-workflows/FR-001 流程发现与声明一致 | 注册/路径/数量/步骤依赖严格一致 | 深度检查；CLI 负例制造 TS/用例数量/缺依赖/索引错误 | ✅ |
| FR-002 不完整执行无法通过复核 | fail/skip/flaky/降级/空跑/损坏附件失败，原始记录不覆盖 | core/CLI 单测、原生 Bruno 与报告复核、超时/取消进程组回归 | ✅ |
| FR-003 缓存主体和地址必须匹配 | 错误环境/角色/地址/过期/远端 id 或 username 拒绝 | session 单测与 Chromium 缓存复用，401/5xx 身份失败 | ✅ |
| FR-003 CSRF 与登出边界 | 403/100103；正常清 Cookie 后匿名401，恢复材料不误删 | 步骤单测与 7 条合成流程；模拟服务刻意允许旧 token，证明未伪造吊销 | ✅；真实业务未运行 |
| FR-004 认证失败不泄漏材料 | 固定错误、无哨兵、私有权限/忽略 | 输入/HTTP/清理故障、0600/路径链接回归与合成浏览器；只持久化两类 Cookie，无 localStorage | ✅ |
| FR-005 基础流程按现有 HTTP 契约断言 | 7 条系统流程与明确环境结果 | 5 Playwright/2 Bruno 全部合成执行，API 步骤协议回归；真实未运行明确记录 | ✅ 实现及合成；真实未运行 |
| FR-006 无业务服务仍可检查框架 | 离线与合成独立，不自动起业务服务 | 51 单测、Chromium 随机端口服务 finally 关闭；doctor 不可达负例 | ✅ |
| continuous-integration/FR-002 三类检查都在工作流中 | 保留后端/前端/规格命令且无配置缓存 | YAML 解析与原有 L7 运行 | ✅ |
| continuous-integration/FR-002 工作流语法有效 | actionlint 或 YAML 解析 | 本机 PyYAML 解析通过，未运行远端 Actions | ✅ |
| continuous-integration/FR-002 测试流程离线检查纳入 CI | 独立 Node24 安装与检查 | YAML job 断言、本机 frozen install + test:flows:check | ✅ 本地；远端未触发 |

## 越界检查

以 `git status --short --untracked-files=all`（包含新增文件）与 plan/notes 所有权核对：tests/ 属 E1～E4/E6，根命令/依赖/CI/忽略属 E1/E5，文档/导航/AGENTS/state 属 E6，change 自身为治理产物。唯一额外根文件 pnpm-workspace.yaml 已申报。锁文件的 supports-color/可选 peer 上下文重算由新增 Bruno 依赖产生，现有包的直接版本约束未修改，原有构建/测试/lint 验证通过。没有未申报越界。

## 不一致项归属判定

| 内容 | 判定 | 处置 |
|---|---|---|
| API 登录响应 JSON 损坏但已设置有效 Cookie 时，步骤曾来不及保存 principal | 实现缺口 | 在 E4 的 finally 从已收到的 Cookie 恢复 principal、登记并正常清理；新增负例通过。设计意图保持不变。 |
| 合成页面最初按 token Cookie 判断 HTML 登录，而 token Path=/api-backend | 合成替身错误 | HTML 路由使用前端可读的 CSRF 标记；实际 API 仍校验 HttpOnly token。七流程真实 Chromium 重跑通过。 |
| protobufjs 安装脚本触发严格策略 | 工程接入缺口 | 最小 allowBuilds=false 声明，frozen install 验证；不改变业务或质量规则。 |

以上均在实现与验证中修复，最终无待处置不一致，不修改 spec 迁就实现。

## 遗留问题

- **真实业务未运行**：本次未提供专用密码测试凭据与明确目标环境，不使用种子密码。所有真实认证/登录入口/健康流程没有真实通过结论；合成通过不替代该结论。覆盖边界已写 tests/docs/coverage.md 与 artifact.md 本次现状记录。
- 原有架构欠账不在本次范围，未关闭或重新编号。没有发现并隐瞒新的产品缺陷；未覆盖完整角色矩阵、短信/MFA/SSO、对象存储与业务 CRUD，按批准的首批范围记录。
- 远端 CI 未触发；本次完成配置与本地等效离线命令验证。

## 流程反馈

单检出串行执行无协调冲突；必要安装策略连带在 E1 笔记明确申报。未修改 schema 或守卫。

## 结论

- [x] 集成完成，笔记及越界汇总齐全
- [x] L7 三项全绿
- [x] tasks.md 全部覆盖
- [x] design/specs 一致
- [x] 无未申报越界
- [x] 不一致项已处置

**判定**：通过。L9 最终差异于 2026-11-15 经用户回复「批准」确认，授权使用原生 OpenSpec CLI 归档；未授权提交或推送。


## L10 归档结果（2026-11-15）

用户批准后，以原生 CLI 归档到 `2026-11-15-import-test-workflow-framework`；新增 6 项需求、修改 1 项需求。新主规格 status=active，能力索引已重新生成；6 条任务全部完成，活跃 change 已移除。归档后 `node openspec/check.mjs` 与本次两份主规格的 strict 校验通过。

额外的全部主规格 strict 校验有 7 项既有篇幅警告导致非零退出；在 HEAD 基线隔离副本运行相同命令同样失败（10 通过/7 失败），当前增加本能力后为 11 通过/7 失败。未更改这七份规格，未影响 L7 或本次规格归档；登记为 `artifact.md#28`，日志见 evidence/baseline-spec-validation.log 与 archive-spec-validation.log。未提交、未推送。

提交前检查覆盖了全部暂存新增文件：原始 evidence/*.log 含工具自身输出的行尾空格与末尾空行，为保持证据原样不整理日志；排除这些原始日志后，`git diff --cached --check` 通过。
