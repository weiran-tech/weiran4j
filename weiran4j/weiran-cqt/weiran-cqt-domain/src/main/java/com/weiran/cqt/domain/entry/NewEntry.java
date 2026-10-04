package com.weiran.cqt.domain.entry;

import com.weiran.cqt.domain.competition.EntryStage;
import java.time.LocalDateTime;
import org.jspecify.annotations.Nullable;

/**
 * 待写入的作品（前台报名）。
 *
 * @param entryNo 报名号
 * @param sourceChannelId 来源渠道：个人账号 1、学校账号 2
 * @param sourceId 来源编号（报名序号）
 * @param competitionId 赛事 ID
 * @param legacyCompetitionId 赛事旧编号
 * @param stage 阶段
 * @param firstCategoryLegacyId 一级赛项
 * @param secondCategoryLegacyId 二级赛项
 * @param regionLegacyId 赛区
 * @param legacySchoolId 学校编号
 * @param title 作品名
 * @param description 作品介绍
 * @param attachment 附件
 * @param teacherNames 指导教师
 * @param majorName 专业
 * @param groupName 首位成员组别
 * @param team 是否团体
 * @param groupSize 人数
 * @param now 提交时间
 */
public record NewEntry(
        String entryNo,
        int sourceChannelId,
        long sourceId,
        long competitionId,
        @Nullable Long legacyCompetitionId,
        EntryStage stage,
        long firstCategoryLegacyId,
        @Nullable Long secondCategoryLegacyId,
        @Nullable Long regionLegacyId,
        @Nullable Long legacySchoolId,
        String title,
        @Nullable String description,
        Attachment attachment,
        @Nullable String teacherNames,
        @Nullable String majorName,
        String groupName,
        boolean team,
        int groupSize,
        LocalDateTime now) {}
