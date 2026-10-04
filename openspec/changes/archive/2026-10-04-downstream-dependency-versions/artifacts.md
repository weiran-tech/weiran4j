# downstream-dependency-versions · 验收摘要

**做了什么**:fork 下游在独占文件 `weiran4j/weiran-dependencies/biz-dependencies.gradle.kts` 登记业务依赖版本与第三方 BOM,
不改上游文件;`weiran-app` 的 `check` 新增 `verifyFrameworkVersions`,防止下游(直接或经传递依赖)悄悄改动框架依赖版本。
写法见契约 §2.2,原则见 D-013,证据与逐条核对见 `exec/verify.md`。

**运行时 / 手工验证**:临时下游清单四场景(guava 未管理依赖 / 钉高 jackson-databind 2.22.1 / 钉低 2.20.0 / 空理由白名单),
临时在 `weiran-app` 加 `implementation("com.google.guava:guava")` 验证业务模块不写版本可解析;验完全部还原。
未做:没有用真实的阿里云 SDK 验证(本机缓存无该包),首个真实用例由下游接入时完成。

**已知缺口**:只检查 `runtimeClasspath`;下游第三方 BOM 把框架依赖往低拉不检查(Gradle 取高,实际版本不变)。

**交给下游的注意事项**:
- applied 脚本里没有 `api(...)` 访问器,写 `add("api", ...)`。
- 新 SDK 若把框架依赖传递拉高,`check` 会红;先 `dependencyInsight` 查来源,确认可接受后写进 `extra["weiran.bizVersionDriftAllowlist"]` 并写理由。
