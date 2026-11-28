---
title: "Wuli3 实施计划"
status: "draft"
updated_at: "2026-11-27"
derived_from: "../tasks.md"
---
# Exec Plan

## 1. 任务映射

| tasks.md 条目 | 执行单元 ID | 层 |
|---|---|---|
| 1.1 | E1 | L0 |
| 1.2 | E2 | L0 |
| 1.3 | E3 | L0 |
| 1.4 | E4 | L1 |

### 未映射条目

| 条目 | 原因 |
|---|---|
| 8.1 | E3 实际验证时发现并修复，详见 verify.md；无独立并行执行单元，不虚构提前规划 |


### L7 测试基线

main f17c86f，加上本会话已授权的 Boot/MP 调整；使用 JDK 21 全量 spotlessApply 后 check --no-daemon，OrbStack Docker 显式传 DOCKER_HOST。前端无修改。

## 2. 依赖图

E1 → E2 → E3 → E4，全部串行，无并行 agent。

## 3. 分层执行计划

### Layer 0

| 执行单元 | 内容 | 涉及文件 |
|---|---|---|
| E1 | 认证仓库、CI 与 Docker secrets | settings.gradle.kts、工作流、Dockerfile、compose |
| E2 | BOM 和漂移基线 | weiran-dependencies/build.gradle.kts |
| E3 | starter 和回归测试 | weiran-framework 构建与测试 |

完成判据：framework check 通过、依赖快照和协议冻结。

### Layer 1

E4 更新 README、AGENTS、后端契约/部署和架构决策，随后执行全量 L7，不再改代码。

## 4. 契约冻结

| 契约 | 签名 / 结构 | 定义位置 | 消费方 | 冻结 |
|---|---|---|---|---|
| HTTP | code 数字 0/message/data；错误 HTTP 状态沿原定义 | framework/response、error | E3 验证所有字段与错误状态，E4 描述边界 | ☑ |
| 分页 | list/total/page/pageSize | framework/page | E3 验证 MyBatis 分页；前端读取不变 | ☑ |
| 仓库 | com.wulicode.wuli3、1.1.1、GitHub Packages | settings、BOM | E1 提供外部凭据，E2 读取正式平台，E3 消费无版本 starter | ☑ |

### 契约变更记录

无，签名保持现有协议。

## 5. 并行判据与文件所有权

WT-0：无他人未提交改动；已有 Boot/MP 调整来自本会话。WT-1：文档后置串行；WT-2：framework/BOM 必须串行；WT-3：不用于放宽共享层限制。

| 执行单元 | 拥有(可写) | 只读 | 禁止触碰 |
|---|---|---|---|
| E1 | settings、工作流、Docker/compose | framework 协议 | 历史迁移、业务、前端 |
| E2 | BOM | Wuli3 POM | 下游业务版本、历史迁移 |
| E3 | framework 外层装配及测试 | system 业务逻辑 | domain/api 公共签名、前端 |
| E4 | 架构、开发、部署文档 | 实现与测试结果 | 业务数据与密钥 |

## 6. 测试归属

E1 核对认证下载和配置不含密钥；E2 版本漂移检查；E3 装配/分层/全量集成测试；E4 文档与规格检查。无独立测试单元。

## 7. 失败与降级

仓库权限不足时输出配置要求，不回退本机源码；发现协议变化停止并回设计；版本冲突先核对来源，不关闭门禁。已有依赖的小范围冲突在批准的兼容边界内解决。

## 8. 收尾要求

各单元完成记录 exec/notes；全部改动结束后产生 L7 证据，再写 verify。

## Gate

- [x] 每条 task 已映射
- [x] 共享层落在 Layer 0
- [x] 无数据库迁移
- [x] 依赖无环
- [x] 契约冻结已列出
- [x] 无独立测试单元
- [x] 所有单元串行
- [x] 禁止触碰已写明
- [x] 失败策略已明确
- [x] 本计划未回写需求侧
