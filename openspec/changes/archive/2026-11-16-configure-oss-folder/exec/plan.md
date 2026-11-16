---
title: "OSS 文件夹执行计划"
status: "draft"
updated_at: "2026-11-15"
derived_from: "../tasks.md"
---

# Exec Plan

## 1. 任务映射

| tasks.md 条目 | 执行单元 ID | 层 |
|---|---|---|
| 3.1 | E1 | L1 |
| 3.2 | E2 | L2 |
| 6.1 | E3 | L3 |

### 未映射条目

无。由同一 agent 串行执行，测试各自跟随实现。

### L7 测试基线

- 基线：main 的 d836470；全量执行 openspec/project.json commands，不缩减后端 check。
- 已知 artifact.md#29 记录前端 Tooltip 偶发测试错误；若再出现，先用独立基线副本验证，再生成最终证据，不通过忽略异常绕过。

## 2. 依赖图

```mermaid
flowchart LR
  E1[配置与校验] --> E2[OSS 路径与历史兼容]
  E2 --> E3[配置示例和说明]
```

E2 调用 E1 配置字段，E3 描述 E1/E2 的行为。无环，无并行。

## 3. 分层执行计划

### Layer 0

共享层零命中，不涉及 BOM、framework、build-logic、迁移或全局序号。

### Layer 1

E1：Aliyun 新增 @DefaultValue("media") folder，规范构造器显式 @ConstructorBinding；保留五参数构造器。非法值在 OSS 客户端创建前拒绝。配置绑定测试覆盖缺省、显式值、空值。

### Layer 2

E2：MediaObjectNames 增加显式 folder 的生成与校验入口，原默认入口保持 media；OSS 显式传参。OSS 存储校验允许安全根目录加规范用户结构；本地保持原根目录校验。测试通过包内假 OSS 客户端验证代传、inspect 和 delete，不访问真实云服务。

### Layer 3

E3：application.yml、.env.example、后端契约与两份部署文档、sys_media 状态说明同步配置，解释旧授权有效期与回退限制。

## 4. 契约冻结

| 契约 | 签名 / 结构 | 定义位置 | 消费方 | 冻结 |
|---|---|---|---|---|
| OSS folder | WEIRAN_STORAGE_ALIYUN_FOLDER / weiran.storage.aliyun.folder，默认 media | SystemStorageProperties.Aliyun | E2 读取 folder；E3 记录默认值 | ☑ |
| 文件夹格式 | [a-zA-Z0-9][a-zA-Z0-9_-]{0,63} | MediaObjectNames | E1 配置校验；E2 生成及历史结构校验 | ☑ |

契约变更记录：无。

## 5. 并行判据与文件所有权

| ID | 场景 | 判定 |
|---|---|---|
| WT-0 | 他人活动 | 未发现，只有本 change 未跟踪文件 |
| WT-1 | 文档 | E3 在实现完成后串行更新 |
| WT-2 | 框架/流水线本体 | 不涉及 |
| WT-3 | 单模块改动 | 同一 agent 串行，主检出无 worktree |

| 执行单元 | 拥有(可写) | 只读 | 禁止触碰 |
|---|---|---|---|
| E1 | SystemStorageProperties.java、SystemStoragePropertiesTest.java | 现有配置绑定约定 | framework、前端、Flyway |
| E2 | MediaObjectNames.java、OssFileStorage.java 及两者测试 | LocalFileStorage、ConfiguredBatchFileStorage | 本地/批处理实现、前端、Flyway |
| E3 | application.yml、.env.example、packages/server/docs/01-架构与接口契约.md、packages/server/docs/02-部署.md、docs/deployment.md、state/bizs/sys_media.md | E1/E2 实现 | 其余源码 |

## 6. 测试归属

- E1：Spring Binder 默认值、自定义值、兼容构造器、非法配置。
- E2：固定日期命名、签名 policy、假客户端上传/验收/删除、历史目录、多次切换、跨用户和越界拒绝；保留既有本地与批处理测试。
- E3：EnvExampleTest 与文档核对，全量门禁在全部变更完成后运行并存入 exec/evidence。

## 7. 失败与降级

- 无子 agent 与并行。单项失败修正后重试一次，同项仍失败报告真实日志，不放宽门禁。
- 编译/格式错误先确认 JDK 21 与 spotlessApply；不启用配置缓存或并发 clean。
- 发现需求/契约冲突则回到设计审批，不私自扩大范围。

## 8. 收尾要求

每个单元完成后写 exec/notes/E*-*.md，列明修改、测试、必要连带与遗留问题。

## Gate

- [x] 每条 task 已映射
- [x] 共享层逐项比对且零命中
- [x] 无数据库改动，迁移保持原状
- [x] 依赖图无环
- [x] 契约冻结表完整
- [x] 测试跟随实现
- [x] 无并行文件冲突
- [x] 每单元禁止触碰范围已明确
- [x] 失败策略已填
- [x] 未回写上游意图
