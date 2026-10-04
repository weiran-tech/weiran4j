package com.weiran.cqt.api.entry;

import java.util.List;
import java.util.Map;
import org.jspecify.annotations.Nullable;

/**
 * 前台报名（字段口径同 uniapp）。
 *
 * @param competitionId 赛事 ID
 * @param title 作品名
 * @param firstCategoryId 一级赛项编号
 * @param secondCategoryId 二级赛项编号（0 / null 为无）
 * @param group 个人报名的组别（{@code zubie}）
 * @param team 是否团体（{@code istuandui=1}）
 * @param teamMembers 团体成员（null 表示未提供；格式错误由适配层报 400）
 * @param regionId 赛区
 * @param schoolId 学校编号
 * @param teacherNames 指导教师
 * @param description 作品介绍
 * @param major 专业
 * @param attachmentType 附件类型
 * @param attachmentUrl 附件地址（{@code purl}）
 * @param attachmentName 附件名（{@code purlname}）
 */
public record SignupCommand(
        @Nullable Long competitionId,
        @Nullable String title,
        @Nullable Long firstCategoryId,
        @Nullable Long secondCategoryId,
        @Nullable String group,
        boolean team,
        @Nullable List<Map<String, Object>> teamMembers,
        @Nullable Long regionId,
        @Nullable Long schoolId,
        @Nullable String teacherNames,
        @Nullable String description,
        @Nullable String major,
        @Nullable String attachmentType,
        @Nullable String attachmentUrl,
        @Nullable String attachmentName) {}
