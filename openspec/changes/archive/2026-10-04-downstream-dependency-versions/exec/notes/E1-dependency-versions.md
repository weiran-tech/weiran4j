# E1: 下游第三方依赖版本清单

## 完成的 tasks.md 条目

- 0.1、0.2、1.1、1.2、6.1、6.2、7.1、7.2

## 改了什么

| 文件 | 动作 | 说明 |
|---|---|---|
| `weiran4j/weiran-dependencies/build.gradle.kts` | 改造 | 框架层快照到 extra;上游白名单两条;`biz-dependencies.gradle.kts` 存在才 apply;按约束对象求差得到下游新增约束 |
| `weiran4j/build-logic/.../FrameworkVersionsCheck.kt` | 新增 | `verifyFrameworkVersions`:detached configuration(平台保持传递、被查模块逐个非传递)得出框架版本,与 `runtimeClasspath` 比对 |
| `weiran4j/build-logic/.../BootAppConventionsPlugin.kt` | 改造 | 注册任务并挂入 `check` |
| `weiran4j/docs/01-架构与接口契约.md` | 改造 | §2.2 加一行 + 下游清单写法 |
| `weiran4j/docs/00-决策记录.md` | 改造 | D-013 |
| `openspec/rules/enforced/{constitution,project}.md`、`AGENTS.md`、`weiran4j/README.md` | 改造 | CP-4、SL-2、结构说明 |

## 为什么这么做

- 关键决策:下游新增约束按**约束对象**求差而不是按坐标——下游对上游已钉的模块(如 jjwt)再钉一次时坐标相同,按坐标求差会漏掉。
- 关键决策:任务里捕获 `Project` 引用,不在执行期调用 `Task.project`(Gradle 9 对后者有弃用告警)。
- 考虑过但放弃:按 Maven 坐标组(`org.springframework*` 等)黑名单拦截——列不全;改为让 Gradle 自己解析 BOM 判定「是否框架管理」。
- 考虑过但放弃:`enforcedPlatform`——会静默降级第三方库所需的版本。

## 依赖的契约

- `:weiran-dependencies` 的五个 extra 键(plan 第 4 节)

## 越界申报

| 文件 | 为什么不得不改 | 性质(必要连带/越界扩大) | 是否可能影响其他单元 |
|---|---|---|---|
| `weiran4j/README.md` | 模块表写着「所有版本号只在这里」,与改写后的 CP-4 矛盾 | 必要连带 | 否 |

## 埋的坑 / 遗留

- [ ] 只查 `runtimeClasspath`;测试类路径的漂移不查(interview「本次不决定」)
- [ ] 上游白名单的两条漂移要等 Spring Boot / springdoc 升级后才会消失,届时任务会告警提示删除

## 自测结果

- 命令:`:weiran-app:verifyFrameworkVersions`;`:weiran-app:dependencies --configuration runtimeClasspath` 前后 diff;临时 `biz-dependencies.gradle.kts` 四场景(guava / 钉高 jackson-databind 2.22.1 / 钉低 2.20.0 / 空理由)
- 结果:无清单时通过且类路径逐行一致;A 通过、guava 解析到 33.5.0-jre(by constraint);B、C、D 均失败且信息符合预期;临时文件已删除、`weiran-app/build.gradle.kts` 已还原
