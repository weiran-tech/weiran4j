---
title: "为 fork 下游开扩展点 · 任务"
status: "done"
updated_at: "2026-10-02"
---

# Tasks

> **本文件是需求的权威源,粒度是「做什么」不是「怎么做」。**
> 判定口径与「为什么」在 `<rules>` 块里(与本模板同一个提示词内),这里只留骨架 —— 不抄第二遍。
>
> 骨架:`- [ ] X.Y 描述(FR-00N)`;实现类任务必须回指需求 ID。
> **本组不涉及就整组删掉**,不要逐条写「无变更」。流水线自身的闸门不写成任务。

## 0. 准备

> 只留机器管不了的。

- [x] 0.1 契约先行:`01-架构与接口契约.md` §2.1 改指向登记文件并保留基座号段用量、§3 加 `@SkipApiResponse`、新增「下游扩展入口」小节(配置导入优先级与唯一性、乱序迁移约束、聚合覆盖率门槛、全部旁路文件)(FR-003、FR-004、FR-005、FR-006)
- [x] 0.2 新建 `weiran4j/docs/business-modules.md`(表头 + 框架 + 基座一行,不含变动数值)(FR-006)
- [x] 0.3 `00-决策记录.md` 新增 D-012(总原则 + 上游不得创建的下游文件清单)(FR-001、FR-008)

## 1. 共享契约层 `weiran-common`(TG-1)

> 本次不改 `weiran-common`;本组承载同属 Layer 0 的构建配置(settings / BOM)与 `weiran-framework` 扩展点。

- [x] 1.1 `settings.gradle.kts` 按目录发现业务模块,五层不齐即失败,`weiran-base` 打头其余字母序,清单写入 `gradle.extra["weiran.businessModules"]`(FR-001、FR-002)
- [x] 1.2 `weiran-dependencies` 的本仓模块坐标改读发现清单(FR-001)
- [x] 1.3 `weiran-framework` 新增 `@SkipApiResponse`,`ApiResponseBodyAdvice` 遇到(含元注解)即不包,javadoc 补第四条边界与「只用于 `/api/**` 之外」(FR-005)

## 3. 应用与基础设施层 `*-application` / `*-infrastructure`(TG-3)

> 本次落在装配层 `weiran-app`。

- [x] 3.1 `weiran-app` 构建脚本按清单生成 adapter / infrastructure 依赖与三层覆盖率聚合(FR-001)
- [x] 3.2 `application.yml` 加可选导入 `application-biz.yml` 与 Flyway `out-of-order`(FR-003、FR-004)

## 5. 前端 `web`(TG-5)

- [x] 5.1 `icons.tsx` 抽出 `mergeIcons`,合并 `web/src/biz/icons*.ts` 的 `icons` 导出,基座优先、开发模式重名告警(FR-007)

## 6. 流水线与协作规范

- [x] 6.1 `components-registry` 守卫读取可选 `components.biz.md`,同步 `components.md` 头部说明、`design/check.md`、`design/CHANGELOG.md`(FR-008)
- [x] 6.2 `state/bizs/README.md` 说明下游表索引写 `README.biz.md`(FR-008)
- [x] 6.3 `project.json` sourcePaths 改为 `weiran4j/weiran-*`(FR-008)
- [x] 6.4 `AGENTS.md`:加 `AGENTS.biz.md` 必读、模块新增说明改为自动发现、号段登记指向 `business-modules.md`(FR-001、FR-006、FR-008)
- [x] 6.5 宪法 CP-14 / CP-15 的登记引用改指 `business-modules.md`(FR-006)
- [x] 6.6 `project.md` SL-1~SL-4 与「序号型资源」同步自动发现、登记文件与乱序迁移语义(FR-001、FR-004、FR-006)
- [x] 6.7 `rules-index` 守卫读取可选 `AGENTS.biz.md` 作为第二张索引表,链接正则支持 `*.biz.md`(L5 验证发现,见 `exec/verify.md`)(FR-008)

## 7. 测试

- [x] 7.1 `WebLayerTest`:类级跳过、方法级跳过且同类未标方法仍包、`String` 原样输出(FR-005)
- [x] 7.2 `icons.test.tsx`:`mergeIcons` 追加 / 空集 / 重名基座优先(FR-007)
- [x] 7.3 构建手工验证:`projects` 不变;临时五层 `weiran-demo` 被收录且进 app 依赖;临时三层目录配置失败;验后删除(FR-001、FR-002)
- [x] 7.4 守卫手工验证:临时组件 + `components.biz.md` 不报,删旁路文件后报;验后删除(FR-008)
- [x] 7.5 全量 L7:`project.json` 的 build / test / lint

## 8. 发布

- [ ] 8.1 合入 main 后通知下游 mono4j:`git merge upstream/main`,按契约「下游扩展入口」放置文件

## 9. 上线后

- [x] 9.1 验收记录写入 `artifacts.md`(只写 verify.md 没有的:人读摘要 / 运行时验证 / 已知缺口)
