package com.weiran.cqt.domain.entry;

import org.jspecify.annotations.Nullable;

/**
 * 作品成员。
 *
 * @param participantId 参赛人 ID
 * @param name 姓名
 * @param idCard 证件号
 * @param credentialType 证件类型（库中值）
 * @param phone 手机号
 * @param school 学校
 * @param group 组别
 * @param leader 是否队长
 */
public record TeamMemberRow(
        long participantId,
        @Nullable String name,
        @Nullable String idCard,
        @Nullable String credentialType,
        @Nullable String phone,
        @Nullable String school,
        @Nullable String group,
        boolean leader) {}
