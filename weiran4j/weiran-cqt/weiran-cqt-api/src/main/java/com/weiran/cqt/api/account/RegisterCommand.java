package com.weiran.cqt.api.account;

import org.jspecify.annotations.Nullable;

/**
 * 注册（字段口径同 uniapp）。
 *
 * @param type 1 个人、2 学校
 * @param name 姓名 / 学校名称
 * @param phone 手机号
 * @param code 短信验证码
 * @param password 密码
 * @param passwordConfirmation 确认密码
 * @param sex 性别
 * @param idCard 证件号
 * @param credentialType 证件类型
 * @param cityId 赛区编号
 * @param school 学校
 * @param schoolId 学校编号
 * @param contact 联系人
 * @param address 地址
 * @param email 邮箱
 * @param license 营业执照 URL
 * @param commitment 承诺书 URL
 */
public record RegisterCommand(
        @Nullable Integer type,
        @Nullable String name,
        @Nullable String phone,
        @Nullable String code,
        @Nullable String password,
        @Nullable String passwordConfirmation,
        @Nullable Integer sex,
        @Nullable String idCard,
        @Nullable String credentialType,
        @Nullable Integer cityId,
        @Nullable String school,
        @Nullable String schoolId,
        @Nullable String contact,
        @Nullable String address,
        @Nullable String email,
        @Nullable String license,
        @Nullable String commitment) {}
