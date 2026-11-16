---
title: "OSS 文件夹配置验收"
status: "draft"
updated_at: "2026-11-16"
approved_by: "用户"
approved_at: "2026-11-16"
---

# Verify

# 一、集成记录(L6)

**并行方式**：单工作区，无并行集成。
**执行单元数**：3 个，由同一 agent 串行执行。

## 输入检查

- [x] E1、E2、E3 收尾笔记齐全并已阅读
- [x] 共享层零命中，配置契约未变
- [x] 自测与全量门禁通过

## 重复实现消除

公共文件夹格式与生成逻辑留在 MediaObjectNames；OSS 显式传入 folder，本地继续使用默认入口。未复制票据签名或创建另一套对象名规则。

## 被牺牲的方案

| 放弃的方案 | 来源 | 理由 |
|---|---|---|
| 直接把所有 media 字面量替换为配置 | E2 | 会连带改变本地目录及历史兼容校验 |
| 删除只接受当前配置目录 | E2 | 切换配置后旧文件不能删除 |
| 数据库存储根目录设置 | E1 | 属于部署配置，不增加运行期全局状态 |

## 越界修改汇总

| 文件 | 申报单元 | 性质 | 处置 |
|---|---|---|---|
| MediaObjectNames.java 的目录校验 | E1/E2 | 必要连带 | E1 需要与 E2 共享格式，保留；同一 agent 串行完成 |

# 二、规格一致性(L8)

## 前置条件:L7 硬闸门

| 检查(commands 的键) | 命令 | 结果 | 证据 |
|---|---|---|---|
| build | `(cd packages/server && JAVA_HOME=${JAVA_HOME_21:-$(/usr/libexec/java_home -v 21)} ./gradlew assemble --no-daemon) && pnpm --filter @weiran/manage build` | ☑ 通过 | `evidence/build.log` |
| test | `(cd packages/server && JAVA_HOME=${JAVA_HOME_21:-$(/usr/libexec/java_home -v 21)} ./gradlew test --no-daemon) && pnpm --filter @weiran/manage test` | ☑ 通过 | `evidence/test.log` |
| lint | `(cd packages/server && JAVA_HOME=${JAVA_HOME_21:-$(/usr/libexec/java_home -v 21)} ./gradlew check --no-daemon) && pnpm --filter @weiran/manage lint` | ☑ 通过 | `evidence/lint.log` |

- 全部后端命令使用 JDK 21，先执行 spotlessApply；无配置缓存或并发 clean。
- 后端测试结果 338 条，0 失败、0 错误、0 跳过，包含 Testcontainers 集成测试及 EnvExampleTest。存储相关 19 条全部通过。
- 前端 56 个测试文件、446 条测试通过；额外执行一次未修改前端源码的基线测试也通过，未复现 artifact.md#29 的偶发 Tooltip 异常。
- `pnpm build:docs` 通过，证据 `evidence/docs.log`；`openspec validate configure-oss-folder --strict --no-interactive` 通过。
- 补齐本机缺失的前端安装文件后执行门禁，未修改锁文件或依赖声明。后端 check 中现有 SpotBugs 提示缺少 jakarta.servlet.Filter、前端构建体积与第三方指令警告均未阻断检查，未引入规则豁免。

## tasks.md 逐条核对

| tasks.md 条目 | 执行单元 | 实现位置 | 一致 |
|---|---|---|---|
| 3.1（FR-001） | E1 | SystemStorageProperties.Aliyun、SystemStoragePropertiesTest | ☑ |
| 3.2（FR-001） | E2 | MediaObjectNames、OssFileStorage 及其测试 | ☑ |
| 6.1（FR-001） | E3 | application.yml、.env.example、两份部署说明、架构契约和 sys_media 状态 | ☑ |

未实现条目：无。

## design.md 一致性

| design 章节 | 设计要求 | 实现情况 | 一致 |
|---|---|---|---|
| Architecture / DS-1 | 默认 media，兼容五参构造器 | @DefaultValue 与显式 @ConstructorBinding，保留五参构造器并有绑定测试 | ☑ |
| Data Flow | 新目录只作用 OSS，授权和代传一致 | 显式 folder 生成器，policy/票据/代传共用前缀 | ☑ |
| API Design | API 字段不变 | 前端仍读取现有 keyPrefix，未改 DTO 或 Controller | ☑ |
| Database Design | 不迁移历史记录 | 无 SQL 与持久化改动 | ☑ |
| DS-4 / DS-5 | 权限及五层边界保持 | 无新增依赖、权限或装配 | ☑ |
| DS-6 | 前端不改页面 | 无 manage/semi-components 源码变更 | ☑ |
| Observability | 不泄露目录输入或凭据 | 错误仅指明变量及允许格式，非法配置测试断言无 secret | ☑ |
| Rollout / Rollback | 默认兼容，说明旧对象回退限制 | 配置示例与部署说明同步，无旧对象移动 | ☑ |

## specs 验收标准核对

| spec / Scenario | 验收标准 | 验证方式 | 通过 |
|---|---|---|---|
| system-file-storage/FR-001 存储未配置 | 旧禁用模式不受影响 | SecurityConfigStorageIT（全量后端测试） | ☑ |
| 阿里云 OSS 流式写入 | InputStream、长度和 URL 传给 SDK | usesConfiguredFolderForUploadsAndAuthorization | ☑ |
| 阿里云配置不全与写入失败 | 旧配置/异常映射保持 | 现有自动配置分支不变、全量后端回归，无新增凭据输出 | ☑ |
| 判定地址是否由本系统存储产生 | 公网前缀规则不变 | 未改 URL 所属判断，全量应用与本地回归 | ☑ |
| 安全删除对象 | 原路径安全规则和重复删除能力保留 | preservesHistoricalObjectsAndTickets 及现有本地接口集成测试 | ☑ |
| 默认与定制 OSS 文件夹 | AC-1、AC-2：默认 media，自定义 assets，授权与代传一致 | 绑定测试、createsScopedDirectUploadAuthorization、namesCustomOssFiles、usesConfiguredFolderForUploadsAndAuthorization | ☑ |
| 非法 OSS 文件夹 | AC-3：空值、路径穿越、特殊字符和超长值拒绝 | rejectsUnsafeFolders、limitsFolderLength、显式空值绑定测试 | ☑ |
| 文件夹切换后的历史兼容 | AC-4：media→assets→archive，旧票据验收与旧对象删除 | preservesHistoricalObjectsAndTickets；伪造签名、错用户、错前缀和越界删除拒绝 | ☑ |
| 文档和环境变量 | AC-5：文档和默认值齐全，门禁通过 | EnvExampleTest、文档构建和三项日志 | ☑ |

## 越界检查

- git diff 文件集逐项与 E1/E2/E3 拥有文件对照：3 个生产 Java 文件、3 个测试 Java 文件、应用配置、环境示例、两份部署说明、后端契约与状态文档均有归属。
- OpenSpec 规划、笔记与证据是本流程产物；唯一必要连带已在上方和 E1 笔记申报。
- 未改 framework、BOM、build-logic、Flyway、本地或批处理实现、前端页面/组件；无未申报越界。

## 不一致项归属判定

无未处置不一致。首次针对性测试编译误用 InspectedFile.file() 属于测试代码错误，已改为既有 stored()；之后定向测试与全量测试通过。未修改已批准设计或用文档迁就代码。

## 遗留问题

- 本次不操作真实 OSS Bucket，云端权限与真实浏览器上传不作已验证声明；实际 SDK 参数、授权、验收和删除均用假客户端验证。
- 存量 artifact.md#29（Tooltip 测试偶发异常）本次未复现；本次不处理该前端问题。
- 本次无新增未修复的产品或技术问题。

## 流程反馈

- 三个执行单元串行完成，无并行或共享文件冲突。

## 结论

- [x] 集成完成，越界汇总已写
- [x] L7 三项全绿
- [x] tasks.md 全部覆盖
- [x] design/specs 一致
- [x] 无未申报越界
- [x] 不一致项已处置

**判定**：通过，进入 L9 人类审阅 diff。

L9 签字：用户于 2026-11-16 回复“批准”，同意最终 diff、归档并继续发布 lib 0.2.15。
