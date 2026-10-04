package com.weiran.cqt.api.competition;

import org.jspecify.annotations.Nullable;

/**
 * 赛事列表项（字段名即前台键名）。
 *
 * @param id 赛事 ID
 * @param legacyId 旧编号（前台键 {@code legacy_id}）
 * @param name 名称
 * @param edition 届次
 * @param year 年份
 * @param description 说明
 * @param status 状态
 */
public record CompetitionView(
        long id,
        @Nullable Long legacyId,
        String name,
        @Nullable String edition,
        @Nullable Integer year,
        @Nullable String description,
        int status) {}
