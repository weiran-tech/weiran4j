## ADDED Requirements

### Requirement: [FR-009] 下游依赖版本清单

`weiran-dependencies` **MUST** 在 `weiran4j/weiran-dependencies/biz-dependencies.gradle.kts` 存在时 apply 它,使其中登记的版本约束与 import 的第三方 BOM
成为统一依赖平台的一部分;业务模块 **MUST** 照常以不带版本的坐标声明这些依赖。该文件不存在时,依赖解析结果 **MUST** 与没有这一机制时相同。
上游 **MUST NOT** 创建该文件。

#### Scenario: 无下游清单时行为不变
- **WHEN** 仓库中没有 `biz-dependencies.gradle.kts`
- **THEN** `weiran-app` 的 `runtimeClasspath` 与引入本机制前一致
- **判据**:改动前后 `./gradlew :weiran-app:dependencies --configuration runtimeClasspath` 输出逐行一致

#### Scenario: 登记框架未管理的依赖
- **WHEN** 下游清单以 `add("api", "g:a:v")` 登记一个框架 BOM 未管理的依赖,某模块以 `implementation("g:a")` 声明它
- **THEN** 依赖解析到版本 `v`,`verifyFrameworkVersions` 通过
- **判据**:`dependencyInsight` 显示 `g:a:v`;任务退出码 0

### Requirement: [FR-010] 框架依赖版本防护

`weiran-app` 的 `check` **MUST** 包含 `verifyFrameworkVersions`:对 `runtimeClasspath` 中每个由框架层(上游两个 BOM 与上游 constraints)管理的模块,
实际选中版本与框架版本不一致且未被白名单豁免时 **MUST** 失败,输出模块坐标、框架版本与实际版本。
下游清单对框架已管理模块的直接版本约束 **MUST** 一律失败,不论高低,不可豁免。
白名单(上游写在 BOM、下游写在下游清单)每条 **MUST** 带非空理由;理由为空时 **MUST** 失败。白名单中已不再漂移的条目 **MUST** 输出警告。

#### Scenario: 下游钉高框架依赖
- **WHEN** 下游清单登记 `com.fasterxml.jackson.core:jackson-databind` 高于框架的版本
- **THEN** `verifyFrameworkVersions` 失败
- **判据**:退出码非 0,输出含 `jackson-databind`、框架版本与实际版本

#### Scenario: 下游钉低框架依赖
- **WHEN** 下游清单登记框架已管理模块低于框架的版本
- **THEN** `verifyFrameworkVersions` 失败,指出下游清单不得约束框架依赖
- **判据**:退出码非 0,输出含该 `g:a` 与「下游清单」字样

#### Scenario: 有理由的白名单放行
- **WHEN** 某漂移在白名单中且理由非空
- **THEN** 检查通过
- **判据**:当前上游(含 snakeyaml、commons-lang3 两条白名单)`./gradlew :weiran-app:verifyFrameworkVersions` 退出码 0

#### Scenario: 理由为空的白名单
- **WHEN** 白名单某条理由为空字符串
- **THEN** 检查失败
- **判据**:退出码非 0,输出含该 `g:a` 与「理由」字样
