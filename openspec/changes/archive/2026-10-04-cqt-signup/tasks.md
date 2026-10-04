---
title: "cqt-signup 任务"
status: "done"
updated_at: "2026-10-05"
---

# Tasks

## 2. 领域层 `*-domain` / `*-api`(TG-2)

- [x] 2.1 赛事规则：报名窗口判定、报名阶段推导（cqt-competition/FR-001、cqt-entry-signup/FR-004）
- [x] 2.2 报名规则：附件、团队成员、组别匹配、阶段冲突判定、报名号格式（cqt-entry-signup/FR-002、cqt-entry-signup/FR-003、cqt-entry-signup/FR-004、cqt-entry-signup/FR-005）
- [x] 2.3 端口：赛事仓储、作品仓储、序列；`FileStorage#isStoredUrl`（cqt-competition/FR-002、cqt-entry-signup/FR-005、cqt-file-storage/FR-003）
- [x] 2.4 对外契约：赛事查询、报名、我的报名服务接口与视图（cqt-competition/FR-002、cqt-competition/FR-003、cqt-entry-signup/FR-006）

## 3. 应用与基础设施层 `*-application` / `*-infrastructure`(TG-3)

- [x] 3.1 Flyway：赛事 / 赛项 / 组别；作品 / 人员 / 参赛人 / 唯一键 / 评审对象 / 序列（cqt-competition/FR-001、cqt-entry-signup/FR-005）
- [x] 3.2 持久化与仓储实现、序列实现（cqt-competition/FR-002、cqt-competition/FR-003、cqt-entry-signup/FR-005、cqt-entry-signup/FR-006）
- [x] 3.3 `isStoredUrl`：OSS 与本地实现（cqt-file-storage/FR-003）
- [x] 3.4 应用服务：赛事查询（cqt-competition/FR-002、cqt-competition/FR-003）
- [x] 3.5 应用服务：报名（事务、校验顺序、唯一键冲突转 409）（cqt-entry-signup/FR-001、cqt-entry-signup/FR-002、cqt-entry-signup/FR-003、cqt-entry-signup/FR-004、cqt-entry-signup/FR-005）
- [x] 3.6 应用服务：我的报名列表与详情（cqt-entry-signup/FR-006）
- [x] 3.7 导入脚本（赛事、赛项、人员、作品、参赛人、评审对象、唯一键回填、序列初始化）与新届种子脚本（cqt-competition/FR-004）

## 4. 适配层 `*-adapter`(TG-4)

- [x] 4.1 `CompetCategoryController` 加 `competitionlists`、`secondcategory`、`groups`、`productlists`；`AuthController#getsecondcat`（cqt-competition/FR-002、cqt-competition/FR-003、cqt-entry-signup/FR-006）
- [x] 4.2 `CompetitionController`：`signup`、`signupdetail`（cqt-entry-signup/FR-001、cqt-entry-signup/FR-006）
- [x] 4.3 自动配置登记（cqt-entry-signup/FR-005）

## 5. 测试

- [x] 5.1 领域单测：窗口、阶段、冲突矩阵、附件、团队、组别、报名号
- [x] 5.2 基础设施单测：`isStoredUrl`
- [x] 5.3 集成测试 `CqtSignupIT`
- [x] 5.4 导入与种子脚本在一次性 MySQL 容器两遍执行

## 6. 发布

- [ ] 6.1 切换时执行导入与种子脚本，确认后启用新赛事
- [x] 6.2 文档：`AGENTS.biz.md`（导入顺序、种子、启用步骤）；`state/bizs/{cqt_competitions,cqt_entries}.md` 与索引（含已知缺口）

## 7. 上线后

- [ ] 7.1 验收记录写入 `artifacts.md`(只写 verify.md 没有的:人读摘要 / 运行时验证 / 已知缺口)
