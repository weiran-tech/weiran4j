package com.weiran.cqt.api.entry;

import java.time.LocalDateTime;
import java.util.List;
import org.jspecify.annotations.Nullable;

/**
 * 报名详情（适配层按 uniapp 键名输出 {@code productinfo / team / msg / step}）。
 *
 * @param productId 作品 ID
 * @param entryNo 报名号
 * @param competitionId 赛事 ID
 * @param competitionName 赛事名
 * @param stage 阶段
 * @param firstCategoryId 一级赛项
 * @param firstCategoryName 一级赛项名
 * @param secondCategoryId 二级赛项
 * @param secondCategoryName 二级赛项名
 * @param regionId 赛区
 * @param regionName 赛区名（空串表示无）
 * @param schoolId 学校编号
 * @param title 作品名
 * @param description 介绍
 * @param attachmentUrl 附件地址
 * @param attachmentName 附件名
 * @param attachmentType 附件类型
 * @param teacherNames 指导教师
 * @param major 专业
 * @param group 组别
 * @param team 是否团体
 * @param status 作品状态
 * @param legacyStatus 审核状态
 * @param submittedAt 提交时间
 * @param createdAt 创建时间
 * @param message 进度文案
 * @param step 进度步骤
 * @param members 成员
 */
public record EntryDetailView(
        long productId,
        String entryNo,
        long competitionId,
        @Nullable String competitionName,
        String stage,
        @Nullable Long firstCategoryId,
        @Nullable String firstCategoryName,
        @Nullable Long secondCategoryId,
        @Nullable String secondCategoryName,
        @Nullable Long regionId,
        String regionName,
        @Nullable Long schoolId,
        @Nullable String title,
        @Nullable String description,
        @Nullable String attachmentUrl,
        @Nullable String attachmentName,
        @Nullable String attachmentType,
        @Nullable String teacherNames,
        @Nullable String major,
        @Nullable String group,
        boolean team,
        String status,
        @Nullable Integer legacyStatus,
        @Nullable LocalDateTime submittedAt,
        @Nullable LocalDateTime createdAt,
        String message,
        int step,
        List<Member> members) {

    /**
     * 成员。
     *
     * @param id 参赛人 ID
     * @param name 姓名
     * @param idCard 证件号
     * @param credentialType 证件类型展示名
     * @param phone 手机号
     * @param school 学校
     * @param group 组别
     * @param leader 是否队长
     */
    public record Member(
            long id,
            @Nullable String name,
            @Nullable String idCard,
            String credentialType,
            @Nullable String phone,
            @Nullable String school,
            @Nullable String group,
            boolean leader) {}
}
