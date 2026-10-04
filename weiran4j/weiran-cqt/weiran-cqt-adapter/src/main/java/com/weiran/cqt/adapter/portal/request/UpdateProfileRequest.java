package com.weiran.cqt.adapter.portal.request;

import com.fasterxml.jackson.annotation.JsonProperty;
import org.jspecify.annotations.Nullable;

/**
 * 修改资料（uniapp {@code pages/my/my.vue}）。只声明允许本人修改的字段与用于比对的 {@code phone}；
 * 其余字段（{@code rejectreason}、{@code status}、{@code type}、{@code chengnuoshuname}…）不声明即被忽略。
 *
 * @param name 姓名 / 学校名称
 * @param phone 手机号（只用于比对）
 * @param schoolid 学校编号
 * @param idcard 证件号
 * @param credentialType 证件类型
 * @param cities 赛区编号
 * @param sex 性别
 * @param school 学校
 * @param contact 联系人
 * @param address 地址
 * @param email 邮箱
 * @param zhizhao 营业执照 URL
 * @param chengnuoshu 承诺书 URL
 */
public record UpdateProfileRequest(
        @Nullable String name,
        @Nullable String phone,
        @Nullable String schoolid,
        @Nullable String idcard,
        @JsonProperty("credential_type") @Nullable String credentialType,
        @Nullable String cities,
        @Nullable String sex,
        @Nullable String school,
        @Nullable String contact,
        @Nullable String address,
        @Nullable String email,
        @Nullable String zhizhao,
        @Nullable String chengnuoshu) {}
