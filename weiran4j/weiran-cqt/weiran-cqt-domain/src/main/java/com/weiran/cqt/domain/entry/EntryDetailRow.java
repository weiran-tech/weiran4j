package com.weiran.cqt.domain.entry;

import java.time.LocalDateTime;
import org.jspecify.annotations.Nullable;

/**
 * 报名详情（作品 + 关联名称）。
 *
 * @param entryId 作品 ID
 * @param entryNo 报名号
 * @param competitionId 赛事 ID
 * @param competitionName 赛事名
 * @param stage 阶段
 * @param firstCategoryLegacyId 一级赛项
 * @param firstCategoryName 一级赛项名
 * @param secondCategoryLegacyId 二级赛项
 * @param secondCategoryName 二级赛项名
 * @param regionLegacyId 赛区
 * @param regionName 赛区名
 * @param legacySchoolId 学校编号
 * @param title 作品名
 * @param description 介绍
 * @param attachmentUrl 附件地址
 * @param attachmentName 附件名
 * @param attachmentType 附件类型
 * @param teacherNames 指导教师
 * @param majorName 专业
 * @param groupName 组别
 * @param team 是否团体
 * @param status 作品状态
 * @param legacyStatus 审核状态
 * @param submittedAt 提交时间
 * @param createdAt 创建时间
 */
public record EntryDetailRow(
        long entryId,
        String entryNo,
        long competitionId,
        @Nullable String competitionName,
        String stage,
        @Nullable Long firstCategoryLegacyId,
        @Nullable String firstCategoryName,
        @Nullable Long secondCategoryLegacyId,
        @Nullable String secondCategoryName,
        @Nullable Long regionLegacyId,
        @Nullable String regionName,
        @Nullable Long legacySchoolId,
        @Nullable String title,
        @Nullable String description,
        @Nullable String attachmentUrl,
        @Nullable String attachmentName,
        @Nullable String attachmentType,
        @Nullable String teacherNames,
        @Nullable String majorName,
        @Nullable String groupName,
        boolean team,
        String status,
        @Nullable Integer legacyStatus,
        @Nullable LocalDateTime submittedAt,
        @Nullable LocalDateTime createdAt) {

    /** 按审核状态给出的进度文案（同原系统）。 */
    public String progressMessage() {
        final int value = this.legacyStatus == null ? 0 : this.legacyStatus;
        if (value == 2) {
            return "很遗憾，您的作品未能通过初审。";
        }
        if (value == 3) {
            return "恭喜您的作品顺利通过初审，请耐心等待复赛评审！";
        }
        return "您已报名成功，请等待作品初审！";
    }

    /** 进度步骤：审核状态 0–2 为 1，否则 2（有奖项时为 3，奖项切片补）。 */
    public int progressStep() {
        final int value = this.legacyStatus == null ? 0 : this.legacyStatus;
        return value >= 0 && value <= 2 ? 1 : 2;
    }
}
