package com.weiran.cqt.adapter.portal.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import org.jspecify.annotations.Nullable;

/**
 * 注册（uniapp {@code pages/login/register.vue}）。
 *
 * @param type 1 个人、2 学校
 * @param name 姓名 / 学校名称
 * @param phone 手机号
 * @param code 短信验证码
 * @param password 密码
 * @param passwordConfirmation 确认密码
 * @param sex 性别
 * @param idcard 证件号
 * @param credentialType 证件类型
 * @param cities 赛区编号
 * @param school 学校
 * @param schoolid 学校编号
 * @param contact 联系人
 * @param address 地址
 * @param email 邮箱
 * @param zhizhao 营业执照 URL
 * @param chengnuoshu 承诺书 URL
 */
public record RegisterRequest(
        @Nullable String type,
        @Nullable String name,
        @Nullable String phone,
        @Nullable String code,
        @Nullable String password,
        @JsonProperty("password_confirmation") @Nullable String passwordConfirmation,
        @Nullable String sex,
        @Nullable String idcard,
        @JsonProperty("credential_type") @Nullable String credentialType,
        @Nullable String cities,
        @Nullable String school,
        @Nullable String schoolid,
        @Nullable String contact,
        @Nullable String address,
        @Nullable String email,
        @Nullable String zhizhao,
        @Nullable String chengnuoshu) {}
