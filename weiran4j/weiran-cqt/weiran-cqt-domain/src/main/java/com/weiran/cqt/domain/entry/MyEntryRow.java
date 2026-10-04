package com.weiran.cqt.domain.entry;

import java.time.LocalDateTime;
import org.jspecify.annotations.Nullable;

/**
 * 我的报名列表的一行（队长姓名与手机号随行带出）。
 *
 * @param entryId 作品 ID
 * @param competitionId 赛事 ID
 * @param competitionName 赛事名
 * @param title 作品名
 * @param status 作品状态
 * @param legacyStatus 审核状态
 * @param firstCategoryLegacyId 一级赛项
 * @param secondCategoryLegacyId 二级赛项
 * @param regionLegacyId 赛区
 * @param attachmentUrl 附件
 * @param teacherNames 指导教师
 * @param createdAt 创建时间
 * @param sourceDatabase 来源
 * @param team 是否团体
 * @param leaderName 队长姓名
 * @param leaderPhone 队长手机号
 */
public record MyEntryRow(
        long entryId,
        long competitionId,
        @Nullable String competitionName,
        @Nullable String title,
        String status,
        @Nullable Integer legacyStatus,
        @Nullable Long firstCategoryLegacyId,
        @Nullable Long secondCategoryLegacyId,
        @Nullable Long regionLegacyId,
        @Nullable String attachmentUrl,
        @Nullable String teacherNames,
        @Nullable LocalDateTime createdAt,
        String sourceDatabase,
        boolean team,
        @Nullable String leaderName,
        @Nullable String leaderPhone) {}
