---
title: "核心后台 API 测试验收"
status: "verified"
updated_at: "2026-11-15"
---

# Verify

# 一、集成记录(L6)

**并行方式**：单工作区，无并行集成。6个执行单元依序由同一执行者完成，不使用子代理或worktree。

## 输入检查

- [x] E1～E6笔记齐全且逐份读取
- [x] Layer0协议/身份/所有权/前提/证据契约已完成并保持批准意图
- [x] 新增与原有回归、文档构建、L7均通过

## 重复实现消除

Cookie/CSRF和会话恢复复用既有framework/session.mjs；API fixture只做无Page的会话装配。资源唯一身份、写前记录和清理集中在ResourceLedger；用户/角色/菜单合法DTO构造集中在support/api/data.mjs供身份/权限步骤共享。spec只装配场景与白名单证据；没有复制生产业务层或再造第二个执行器。

## 被牺牲的方案

| 放弃的方案 | 来自 | 理由 |
|---|---|---|
| 使用种子密码/修改既有角色、菜单或配置 | 简化真实测试前提 | 所有写入限定为本次普通资源，已有权限定义与公开标题只读。 |
| 重试未知创建或按前缀批量删除 | 简化恢复 | 未知响应保留精确意图，恢复核对类型/key/id/父级/环境/actor，不能接管其他记录。 |
| 用原浏览器替身覆盖全部新增业务API | 原合成入口 | 浏览器保留原7个样本；新8条API由独立HTTP装配执行，完整发现仍为15。 |
| 自定义配置公开开关/角色双版本字段 | 设计简写中的错误假设 | 当前产品为固定公开白名单、角色单一version；按“只消费既有契约”意图补清，不修改产品。 |
| 原始用户/配置/日志/data响应作为证据 | 调试方便 | 固定错误和白名单布尔/数量；匿名误放行也不能把业务data写入失败产物。 |

## 越界修改汇总

| 文件 | 申报单元 | 性质 | 处置 |
|---|---|---|---|
| tests/synthetic/model.mjs、harness.mjs | E1/E6 | 必要连带 | E1负例先建协议替身，E6扩展实际HTTP/CLI装配，串行保留。 |
| tests/support/api/data.mjs | E3/E1 | 必要连带 | 合法DTO和随机密码构造上提共享层，E5复用，不重复实现。 |

其余文件都在plan拥有范围；packages/、Flyway、BOM、Java测试、源项目、既有归档及锁文件无改动。根package.json仅新增两个测试/恢复脚本。

# 二、规格一致性(L8)

## 前置条件：L7硬闸门

基线为26ca3c9。先JDK21 spotlessApply，再从openspec/project.json.commands逐项读取并串行执行。最终源码完成后补齐完整L7证据，无配置缓存、clean或stash。

| 检查 | 命令 | 结果 | 证据 |
|---|---|---|---|
| build | `(cd packages/server && JAVA_HOME=${JAVA_HOME_21:-$(/usr/libexec/java_home -v 21)} ./gradlew assemble --no-daemon) && pnpm --filter @weiran/manage build` | ✅ exit 0 | `evidence/build.log` |
| test | `(cd packages/server && JAVA_HOME=${JAVA_HOME_21:-$(/usr/libexec/java_home -v 21)} ./gradlew test --no-daemon) && pnpm --filter @weiran/manage test` | ✅ exit 0 | `evidence/test.log` |
| lint | `(cd packages/server && JAVA_HOME=${JAVA_HOME_21:-$(/usr/libexec/java_home -v 21)} ./gradlew check --no-daemon) && pnpm --filter @weiran/manage lint` | ✅ exit 0 | `evidence/lint.log` |

Gradle assemble/test/check均成功，多数任务为UP-TO-DATE，未宣称所有Java用例重新执行。前端Vitest本次实际执行56文件/446测试通过；前端build和ESLint通过。无L7红灯豁免。

| 补充检查 | 结果 | 证据 |
|---|---|---|
| test:flows:check | 类型/步骤/注册/发现/Bruno语法；71测试通过，0fail/skip/cancel | evidence/flows-check.log |
| test:api:synthetic | 1个实际CLI/Playwright+随机HTTP综合回归，8新增流程与10请求匿名矩阵通过；写前提拒绝、真实清理失败/恢复命令、普通产物哨兵扫描通过 | evidence/api-synthetic.log |
| test:flows:browser | 1个真实Chromium综合回归通过，保留原7流程及会话/资源回收验证 | evidence/flows-browser.log |
| build:docs | 通过 | evidence/docs-build.log |
| 流程发现 | 15条注册：11API、2E2E、2Bruno；Playwright发现13用例 | evidence/discovery.log |
| 范围/私有材料/空白 | packages无改动，私有目录被忽略；新增源码/文档/规格空白检查通过，原始工具日志保留原样 | evidence/scope.log、source-check.log |
| OpenSpec | change结构与strict校验通过；验收后再跑全量结构检查 | evidence/openspec.log |

Node原生载入TS保留MODULE_TYPELESS_PACKAGE_JSON提示；构建既有依赖仍有指令/体积提示，未放宽门禁。

## tasks.md逐条核对

| 条目 | 单元 | 实现 | 一致 |
|---|---|---|---|
| 1.1 | E1 | support/api/*、fixtures/api.ts、api-tools单测 | ✅ |
| 2.1 | E2 | core-read、region/read、匿名10请求、read步骤及负例 | ✅ |
| 2.2 | E3 | user/role/menu-lifecycle，identity步骤及负例 | ✅ |
| 2.3 | E4 | dict/config-lifecycle，platform步骤及回归 | ✅ |
| 2.4 | E5 | permission-boundary、隔离主体/撤权快照及负例 | ✅ |
| 3.1 | E6 | 注册/INDEX、合成CLI、根脚本、旧样本和docs/现状 | ✅ |

### 未实现条目

无。真实业务执行有明确前提，不作为缺凭据时假通过的实现条目。

## design.md一致性

| 章节 | 设计要求 | 实际结果 | 一致 |
|---|---|---|---|
| Architecture/Data Flow | 统一CLI、独立API会话、写前登记、逆序清理 | 全部新增流程经过现有严格执行器；API不用Page/Chromium；清理失败使运行失败 | ✅ |
| DS-1共享契约 | 身份/所有权/前提/证据集中 | Cookie复用framework，ResourceLedger固定类型映射；E1先完成再写消费者 | ✅ |
| DS-2 API | 核心读取、五类生命周期、权限和地区 | 状态/数字code/形状/后置读取同时断言；合法空结果、分页归一化与400参数转换；版本冲突409/100007 | ✅ |
| DS-3数据库 | 无DDL/种子/SQL，审计保留 | 生产与迁移零修改，临时普通记录只经现有API创建/删除 | ✅ |
| DS-4权限 | 管理员隔离、临时角色、既有权限只读 | 同一临时Cookie先允许再撤权403，修订变化；已有管理员/角色/菜单未改 | ✅ |
| DS-5/DS-6 | 测试分层、无页面改动、docs同步 | 固定helper/steps/spec边界；docs新增运行与恢复说明，未引入页面组件 | ✅ |
| Observability | 敏感证据保护与双重失败保留 | 原始业务响应不附证据；匿名误放行只保留dataIsNull；两类清理失败仍保留资源恢复编号 | ✅ |
| Test/Rollout/Rollback | 离线/合成/真实区分，原门禁保留 | 本地回归全绿；真实未运行；恢复工具需保留到业务清理确认后再回滚 | ✅ |

## specs验收标准核对

| spec/Scenario | 观察与验证方式 | 通过 |
|---|---|---|
| FR-007 核心接口返回契约可验证 | read正例、字符串code/缺total/坏树/缺字段负例，合法空数组；15条发现；实际CLI执行新8流程和匿名矩阵 | ✅ 离线/合成，真实未运行 |
| FR-007 生命周期与业务约束可重复验证 | 用户/角色/菜单旧版本、唯一键、成环/非叶、字典两种顺序/启用/级联、配置分组/公开白名单；cleanup-state及删除后读取/精确查询 | ✅ 离线/合成，真实未运行 |
| FR-008 未授权写入和错误所有权被拒绝 | 无开关/false/TRUE/1零登录请求；错误环境/地址/主体/ID/类型/父级/宽权限/路径链接/未知文件失败且无DELETE | ✅ |
| FR-008 不确定创建和失败清理能够恢复 | 写后连接断开只POST一次，0600意图id=null仍能精确恢复；实际worker删除失败、CLI恢复及重复恢复；已删标记仍有资源拒绝；明确4xx竞争记录不接管 | ✅ |
| FR-009 同一主体撤权后访问被拒绝 | 临时角色关联已有user:list，隔离Cookie登录；允许用户列表、角色列表403，撤权后同Cookie用户列表403/100102；身份/修订核验；无效撤权与串主体负例失败 | ✅ 离线/合成，真实未运行 |

超时/信号处理由既有CLI回归实际覆盖；资源写前同步记录为中断恢复提供基础，不声称运行了真实业务环境的进程中断演练。普通登出只清Cookie，不声称旧JWT吊销。

## interview验收标准核对

| AC | 对应证据 | 结论 |
|---|---|---|
| AC-1 | 8新增声明/步骤完整，15注册与13Playwright发现、原Bruno语法检查 | ✅ |
| AC-2 | core/region实际步骤及坏形状/空结果负例，真实HTTP合成 | ✅ |
| AC-3 | 5类生命周期+权限实际CLI流程、后置状态与负例 | ✅ |
| AC-4 | 零登录写前拒绝、清单所有权负例、恢复CLI及失败材料 | ✅ |
| AC-5 | 71离线、API综合合成、哨兵扫描；真实未运行明确区分 | ✅ |
| AC-6 | 原Chromium、446前端、L7、docs与OpenSpec；覆盖/运行/现状更新 | ✅ |

## 越界检查

使用包含未跟踪文件的git status核对所有权：tests/support/api与fixture属于E1；read/anon/region属于E2；identity生命周期属于E3；platform属于E4；permissions属于E5；registry/INDEX/根脚本/合成HTTP/框架样本/文档及state属于E6。必要共享模型/DTO上提已申报。治理产物位于本change。差集为空，无未申报越界。

## 不一致项归属判定

| 项 | 判定 | 处置 |
|---|---|---|
| 配置自定义公开开关、角色资料/授权独立版本的设计简写 | 表述与“只消费既有契约”意图不一致 | 已按实际Controller/DTO/Service补清为固定白名单只读和共享version，未改变产品或首批测试意图；不为测试新增开关/版本。 |
| 字典管理ID倒序与启用项sort排序、父级删除后items返回404 | 测试替身/断言需服从现有契约 | 两种顺序用相反数据明确区分，级联按404核验，步骤和合成装配重跑通过。 |
| 匿名误放行时原始data先进入附件 | 实现不满足敏感证据要求 | 改为数字code或null及dataIsNull，新增哨兵负例，正负CLI回归通过。 |
| 错误地址/环境应在登录前拒绝 | 实现前提校验不足 | 登录/读取凭据前验证同hostname、无凭据URL和环境角色格式，负例证明零请求。 |
| 业务/会话同时清理失败可能丢资源恢复编号 | 实现恢复诊断不足 | 保留仅24位白名单runId，两类私有材料及后续恢复验证通过。 |
| 隔离API临时仓库缺根清单/无引用旧步骤，旧计数仍为4/7 | 合成装配遗漏与旧预期 | 临时API仓保留完整15声明并选择tag；旧浏览器精确移除新增样本及无引用步骤；完整发现校验不放宽。 |

所有不一致均已修复并验证，没有用虚假通过或修改生产行为迁就测试。

## 遗留问题

- 真实业务未运行：未提供专用凭据/明确测试环境；不默认admin123、不自动启动已有服务。合成服务不验证真实数据库约束或部署接线，不能代替真实通过。
- 完整角色组合、短信/MFA/SSO、文件/媒体/批处理、地区写入/导出、外部身份和更多配置类型未覆盖；符合本次首批边界，已写tests/docs/coverage.md和docs/testing.md。
- 既有全量主规格strict篇幅警告仍见artifact.md#28；本change strict及仓库结构通过，本次不整理旧规格。
- 没有新增未修复的产品缺陷需要隐瞒或只写归档；现状已更新artifact.md。远端CI未触发，未提交/推送。

## 流程反馈

单工作区串行无合并冲突。控制器与DTO是接口定义事实源；替身只证明执行/断言接线，本次明确区分真实业务结果。不改流水线schema/守卫。

## 结论

- [x] 集成完成，笔记和必要连带齐全
- [x] L7三项全绿
- [x] tasks全部覆盖
- [x] design/specs一致
- [x] 无未申报越界
- [x] 不一致项已处置

**判定**：通过。用户于 2026-11-15 明确回复“归档”，完成 L9 审阅批准，进入 L10 原生 CLI 归档；本次不提交、不推送。
