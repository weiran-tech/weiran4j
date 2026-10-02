## Purpose

本能力长期负责「以 git fork 跟随 weiran4j 的下游项目,不修改任何上游文件即可扩展」的约定:业务模块如何被构建自动发现、
业务默认配置与 Flyway 脚本如何并入、非管理端接口如何跳过统一包络,以及菜单图标、组件清单、现状文档索引、
AI 协作规范这些清单类资源如何由下游独占的旁路文件追加,使上游同步时不产生合并冲突。

## ADDED Requirements

### Requirement: [FR-001] 业务模块自动发现

Gradle 构建 **MUST** 把 `weiran4j/` 下名为 `weiran-<mod>`、且含 `weiran-<mod>-{api,domain,application,infrastructure,adapter}` 五个子目录的目录识别为业务模块,
无需修改任何构建脚本即完成五层 include、BOM 坐标登记、`weiran-app` 对其 `adapter` / `infrastructure` 的依赖,以及
`application` / `infrastructure` / `adapter` 三层的覆盖率聚合。`weiran-base` **MUST** 排在清单第一位,其余按名称字母序。
发现结果 **MUST** 以 `gradle.extra["weiran.businessModules"]`(`List<String>`)对其他构建脚本公开。

#### Scenario: 现有仓库的项目集合不变
- **WHEN** 在只有 `weiran-base` 的仓库执行 `./gradlew projects`
- **THEN** 业务项目恰为 `weiran-base-{api,domain,application,infrastructure,adapter}` 五个
- **判据**:`projects` 输出中以 `weiran-` 开头、以五层后缀结尾的项目集合与改动前逐行一致

#### Scenario: 新增五层齐全的目录即被收录
- **WHEN** 新建 `weiran4j/weiran-demo/weiran-demo-{api,domain,application,infrastructure,adapter}/` 五个目录,不改任何 `.kts`
- **THEN** 构建包含 `:weiran-demo-*` 五个项目,且 `weiran-app` 依赖 `:weiran-demo-adapter` 与 `:weiran-demo-infrastructure`
- **判据**:`./gradlew projects` 列出五个项目;`./gradlew :weiran-app:dependencies --configuration runtimeClasspath` 含两条 `project :weiran-demo-*`

### Requirement: [FR-002] 五层不齐时构建失败

当某个 `weiran-*` 目录含有任一层子目录但五层不齐时,构建 **MUST** 在配置阶段失败,报错信息含该模块名与缺失的层名。
构建 **MUST NOT** 静默跳过这样的目录。

#### Scenario: 只有三层的目录
- **WHEN** 存在 `weiran4j/weiran-half/weiran-half-{api,domain,application}/` 而无另外两层
- **THEN** 任一 Gradle 命令在配置阶段失败
- **判据**:退出码非 0,输出同时包含 `weiran-half`、`infrastructure`、`adapter`

### Requirement: [FR-003] 业务默认配置导入

应用 **MUST** 以 `optional:classpath:application-biz.yml` 导入业务默认配置;该文件不存在时应用正常启动。
被导入的配置 **MUST** 可覆盖 `application.yml` 的同名键,且优先级低于 profile 专属配置文件与环境变量(Spring Boot ConfigData 语义)。

#### Scenario: 无业务配置文件时照常启动
- **WHEN** classpath 中没有 `application-biz.yml`,启动 `weiran-app` 集成测试上下文
- **THEN** 上下文正常加载
- **判据**:`weiran-app` 集成测试全绿;`application.yml` 中 `spring.config.import` 的值为 `optional:classpath:application-biz.yml`

### Requirement: [FR-004] Flyway 乱序迁移

Flyway **MUST** 以 `out-of-order: true` 运行:版本号早于已执行最大版本、但尚未执行的脚本在启动时被执行,而不是使启动失败。
各迁移脚本之间 **MUST NOT** 依赖于版本号顺序之外的隐含执行次序(契约文档注明)。

#### Scenario: 配置已生效
- **WHEN** 读取 `weiran-app` 的 `application.yml`
- **THEN** `spring.flyway.out-of-order` 为 `true`
- **判据**:文件中存在该键且值为 `true`;集成测试在空库上全量迁移成功

### Requirement: [FR-005] 跳过统一响应包络

标注 `@SkipApiResponse`(`com.weiran.framework.web`,可标在类或方法上,支持作为元注解)的 Controller 方法,其返回值 **MUST** 原样写出,
不被包成 `{code, message, data}`;返回 `String` 时 **MUST NOT** 被序列化为 JSON 字符串。未标注的方法行为不变。
`@SkipApiResponse` **MUST NOT** 用于 `/api/**` 下的接口(那里受 `admin-foundation` FR-001 约束),只供 `/api/**` 之外的前缀(如下游 `/api-web/**`)使用。

#### Scenario: 类级标注
- **WHEN** Controller 类标注 `@SkipApiResponse`,方法返回一个对象 `{"code":200,"msg":"ok"}`
- **THEN** 响应体即该对象
- **判据**:`WebLayerTest` 断言 `$.code == 200` 且不存在 `$.data`

#### Scenario: 方法级标注只影响该方法
- **WHEN** 同一 Controller 中方法 A 标注 `@SkipApiResponse`、方法 B 未标注
- **THEN** A 原样输出,B 被包成 `{code:0, data:...}`
- **判据**:`WebLayerTest` 分别断言 A 无 `$.data`、B 的 `$.code == 0`

#### Scenario: String 返回值原样输出
- **WHEN** 标注了 `@SkipApiResponse` 的方法返回字符串 `pong`
- **THEN** 响应体为 `pong`
- **判据**:`WebLayerTest` 断言 `content().string("pong")`

### Requirement: [FR-006] 业务模块号段登记处

业务模块的错误码序号段、菜单 id 段、权限码前缀、Flyway 目录与表前缀 **MUST** 登记在 `weiran4j/docs/business-modules.md`。
上游在该文件中 **MUST** 只维护表头与「框架 + 基座」一行,且该行不含随基座增长而变化的数值;
契约文档、宪法与 `AGENTS.md` 中凡指向号段登记的引用 **MUST** 指向该文件。

#### Scenario: 引用全部指向新文件
- **WHEN** 在 `AGENTS.md`、`openspec/rules/`、`weiran4j/docs/` 中搜索号段登记的引用
- **THEN** 都指向 `business-modules.md`
- **判据**:`grep -rn "§2.1 登记\|「业务模块登记」" AGENTS.md openspec/rules weiran4j/docs` 无匹配;`business-modules.md` 的表体只有一行

### Requirement: [FR-007] 下游菜单图标合并

前端 **MUST** 把 `web/src/biz/icons*.ts` 中具名导出 `icons`(`Record<string, LucideIcon>`)的条目合并进菜单图标表,
使其可在 `IconPicker` 中选择、可被 `renderIcon` / `renderNavIcon` 渲染。与基座同名时 **MUST** 以基座为准。
不存在此类文件时,图标表 **MUST** 与基座白名单完全相同。

#### Scenario: 追加图标
- **WHEN** 合并输入含基座表与一个导出 `{ Rocket }` 的下游模块
- **THEN** 结果含 `Rocket` 与全部基座图标
- **判据**:`icons.test.tsx` 断言 `mergeIcons` 结果含 `Rocket` 且键数 = 基座键数 + 1

#### Scenario: 无下游文件
- **WHEN** 下游模块集合为空
- **THEN** 结果与基座表键集相同
- **判据**:`icons.test.tsx` 断言键集相等

#### Scenario: 重名以基座为准
- **WHEN** 下游导出与基座同名的 `Settings` 但指向另一组件
- **THEN** 结果中 `Settings` 仍是基座组件
- **判据**:`icons.test.tsx` 断言 `result.Settings === base.Settings`

### Requirement: [FR-008] 流水线与协作规范的下游旁路文件

openspec 流水线 **MUST** 接受下游独占的旁路文件,而无需下游修改上游文件:
`openspec/rules/advisory/components.biz.md` 中提到的组件名 **MUST** 视为已登记;
`openspec/state/bizs/README.biz.md` 作为下游表文档的索引;
`AGENTS.md` **MUST** 声明仓库根存在 `AGENTS.biz.md` 时必读;
`openspec/project.json` 的 `sourcePaths` **MUST** 以通配覆盖 `weiran4j/weiran-*` 全部后端模块。
上游 **MUST NOT** 创建这些旁路文件。

#### Scenario: 旁路清单登记的组件不报错
- **WHEN** `web/src/components/` 下有未写进 `components.md` 的组件 `Foo`,而 `components.biz.md` 提到了 `Foo`
- **THEN** `pnpm openspec:check` 不报 `REPO/components-unregistered`
- **判据**:临时构造上述文件后跑 check,输出不含该组件路径;删除 `components.biz.md` 后再跑则报错

#### Scenario: 旁路文件不存在时行为不变
- **WHEN** 仓库中没有 `components.biz.md`
- **THEN** 守卫与改动前判定一致
- **判据**:`pnpm openspec:check` 在当前仓库全部通过

#### Scenario: sourcePaths 覆盖新业务模块
- **WHEN** 读取 `openspec/project.json`
- **THEN** `sourcePaths` 含 `weiran4j/weiran-*`,不再逐个列后端模块
- **判据**:`git log -1 -- 'weiran4j/weiran-*'` 的结果与改动前四条路径的结果一致
