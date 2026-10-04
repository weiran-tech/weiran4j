package com.weiran.cqt.domain.account;

import org.jspecify.annotations.Nullable;

/**
 * 本人可修改的资料（null 表示请求里没有这个字段，不修改）。驳回原因、审核状态、账号类型等不在其中。
 *
 * @param name 姓名 / 学校名称
 * @param phone 手机号：只用于与当前手机号比对，不能借此修改
 * @param schoolId 学校编号
 * @param idCard 证件号
 * @param credentialType 证件类型
 * @param cityId 赛区
 * @param sex 性别
 * @param school 学校
 * @param contact 联系人
 * @param address 地址
 * @param email 邮箱
 * @param license 营业执照（URL）
 * @param commitment 承诺书（URL）
 */
public record ProfileChanges(
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
