package com.weiran.cqt.api.account;

import org.jspecify.annotations.Nullable;

/**
 * 修改本人资料：null 表示不修改。手机号只用于比对，驳回原因、审核状态等不可由本人修改的字段不在其中。
 *
 * @param name 姓名 / 学校名称
 * @param phone 手机号（与当前不同则拒绝）
 * @param schoolId 学校编号
 * @param idCard 证件号
 * @param credentialType 证件类型
 * @param cityId 赛区编号
 * @param sex 性别
 * @param school 学校
 * @param contact 联系人
 * @param address 地址
 * @param email 邮箱
 * @param license 营业执照 URL
 * @param commitment 承诺书 URL
 */
public record UpdateProfileCommand(
        @Nullable String name,
        @Nullable String phone,
        @Nullable String schoolId,
        @Nullable String idCard,
        @Nullable String credentialType,
        @Nullable Integer cityId,
        @Nullable Integer sex,
        @Nullable String school,
        @Nullable String contact,
        @Nullable String address,
        @Nullable String email,
        @Nullable String license,
        @Nullable String commitment) {}
