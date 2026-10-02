# E1: 为 fork 下游开扩展点

## 完成的 tasks.md 条目

- 0.1、0.2、0.3、1.1、1.2、1.3、3.1、3.2、5.1、6.1、6.2、6.3、6.4、6.5、6.6、6.7、7.1、7.2、7.3、7.4

## 改了什么

| 文件 | 动作 | 说明 |
|---|---|---|
| `weiran4j/settings.gradle.kts` | 改造 | 扫描 `weiran-*` 目录:一层都没有的忽略,五层齐全的收录,介于两者之间的 `require` 失败;`weiran-base` 打头;写 `gradle.extra["weiran.businessModules"]` |
| `weiran4j/weiran-dependencies/build.gradle.kts` | 改造 | 本仓坐标改读清单 |
| `weiran4j/weiran-app/build.gradle.kts` | 改造 | 依赖与 `aggregatedCoverageProjects` 改读清单 |
| `weiran4j/weiran-app/src/main/resources/application.yml` | 改造 | `spring.config.import`、`spring.flyway.out-of-order` |
| `weiran-framework/.../web/SkipApiResponse.java` | 新增 | `@Target({TYPE, METHOD})`,TYPE 已覆盖注解类型,因此可作元注解 |
| `weiran-framework/.../web/ApiResponseBodyAdvice.java` | 改造 | `supports()` 用 `AnnotatedElementUtils.hasAnnotation` 查方法与所在类;javadoc 第四条边界 |
| `weiran-framework/src/test/.../web/WebLayerTest.java` | 改造 | 新增 `SkippedController`(类级)、`MixedController`(方法级 + 组合注解 `@WebApi` + 未标注)与 3 个测试 |
| `web/src/utils/icons.tsx` | 改造 | 原表改名 `BASE_ICONS`;导出 `mergeIcons` 与 `BizIconModule`;`MENU_ICONS` = 合并结果 |
| `web/src/utils/__tests__/icons.test.tsx` | 改造 | `mergeIcons` 追加 / 空 / 重名 + 上游无 `src/biz` 时等于基座 |
| `weiran4j/docs/01-架构与接口契约.md` | 改造 | §2.1 改指向 + 基座用量;新增 §2.2「下游扩展入口」;§3 加注解行 |
| `weiran4j/docs/business-modules.md` | 新增 | 表头 + 框架 + 基座一行 |
| `weiran4j/docs/00-决策记录.md` | 改造 | D-012 |
| `openspec/guards/components-registry.mjs` | 改造 | 拼接可选 `components.biz.md` |
| `openspec/guards/rules-index.mjs` | 改造 | 可选 `AGENTS.biz.md` 作第二张索引表;链接正则允许文件名中间带点 |
| `openspec/project.json` | 改造 | sourcePaths |
| `openspec/rules/{enforced/constitution,enforced/project,advisory/components}.md` | 改造 | 引用与说明同步 |
| `openspec/state/bizs/README.md`、`openspec/design/{check,CHANGELOG}.md`、`AGENTS.md` | 改造 | 同步 |

## 为什么这么做

- 关键决策:模块清单只在 settings 算一次,经 `gradle.extra` 给 BOM 与 app——三处各自扫描会各自漂移。
- 关键决策:`mergeIcons` 的重名回调由调用方注入,测试不必 mock `console`;多个下游文件按路径排序合并,结果与 glob 返回顺序无关。
- 考虑过但放弃:在 `supports()` 里按请求路径判断 `/api/**` 强制禁止 `@SkipApiResponse`——`supports()` 拿不到请求,改到 `beforeBodyWrite` 又会让 String 返回值走错 converter;改为规范约束(spec FR-005 + javadoc)。
- 考虑过但放弃:`rules-index` 直接豁免 `*.biz.md`——那会让下游的规则文件失去唯一的唤起途径;改为允许登记在 `AGENTS.biz.md`。

## 依赖的契约

- `gradle.extra["weiran.businessModules"]: List<String>`
- `@SkipApiResponse`
- `web/src/biz/icons*.ts` 的 `export const icons`
- `components.biz.md` 的文本包含判定

## 越界申报

| 文件 | 为什么不得不改 | 性质(必要连带/越界扩大) | 是否可能影响其他单元 |
|---|---|---|---|
| `openspec/guards/rules-index.mjs` | 不改则下游建 `components.biz.md` 必然触发 `REPO/rules-index-missing`,仍得改 `AGENTS.md`,FR-008 无法成立(7.4 验证发现) | 必要连带 | 否(单执行单元);`AGENTS.biz.md` 不存在时行为不变,已验证 |

## 埋的坑 / 遗留

- [ ] `@SkipApiResponse` 用在 `/api/**` 上没有机械拦截,只有规范约束
- [ ] 下游往 `state/bizs/artifact.md` / `cross-biz.md` 追加条目仍会改上游文件(interview「本次不决定」)

## 自测结果

- 命令:`./gradlew projects`(改动前后对比、临时 `weiran-demo`、临时 `weiran-half`);`./gradlew :weiran-framework:check`;`pnpm vitest run src/utils/__tests__/icons.test.tsx`;`node openspec/check.mjs`(临时组件 / `components.biz.md` / `AGENTS.biz.md` 四步)
- 结果:全部符合预期;临时文件均已删除。framework `WebLayerTest` 10/10,icons 7/7
