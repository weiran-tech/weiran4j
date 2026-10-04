package com.weiran.cqt.domain.entry;

import com.weiran.cqt.domain.account.CredentialType;
import org.jspecify.annotations.Nullable;

/**
 * 一位参赛人（个人报名取账号资料，团体报名取成员表单）。
 *
 * @param name 姓名
 * @param credentialType 证件类型
 * @param idCard 规范化证件号
 * @param phone 手机号
 * @param school 学校
 * @param sex 性别
 * @param group 组别，未选为空串
 */
public record Participant(
        String name,
        CredentialType credentialType,
        String idCard,
        @Nullable String phone,
        @Nullable String school,
        @Nullable Integer sex,
        String group) {}
