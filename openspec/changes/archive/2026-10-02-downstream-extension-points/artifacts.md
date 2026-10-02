# downstream-extension-points · 验收摘要

**做了什么**:让以 git fork 跟随 weiran4j 的下游(首个是 mono4j 的 `weiran-cqt`)不改任何上游文件就能接入业务模块、配置、迁移、
`/api-web` 自定包络、菜单图标、组件清单与 AI 协作规范。下游可用的全部入口见契约 `weiran4j/docs/01-架构与接口契约.md` §2.2,
原则见决策 D-012。L7 证据、逐条核对与结论详见 `exec/verify.md`。

**运行时 / 手工验证**(verify.md 只记了结论,这里记操作):
- 构建:临时建 `weiran4j/weiran-demo/` 五层(各放一个 `java-library` 构建脚本)→ `./gradlew projects` 出现 5 个项目,
  `:weiran-app:dependencies --configuration runtimeClasspath` 出现 `project ':weiran-demo-adapter'` 等;临时建三层的 `weiran-half/` → 配置阶段失败。验完删除。
- 守卫:临时组件 `web/src/components/ZzTempWidget.tsx` + `components.biz.md` + `AGENTS.biz.md` 四步验证。验完删除。
- 未做:没有真实起一个下游业务模块跑 `bootRun`,`application-biz.yml` 的覆盖优先级依赖 Spring Boot 文档语义,没有单独写测试。

**已知缺口**:`artifact.md#19`(`@SkipApiResponse` 误用无机械拦截)、`artifact.md#20`(`artifact.md` / `cross-biz.md` 仍无下游旁路文件)。

**交给下游的注意事项**:
- 建模块目录时五层一次建齐,否则构建失败。
- `application-biz.yml` 全应用只能有一份,且不放密钥。
- 放进 `openspec/rules/` 的 `*.biz.md` 要在仓库根 `AGENTS.biz.md` 的索引表里登记,否则 `REPO/rules-index-missing`。
