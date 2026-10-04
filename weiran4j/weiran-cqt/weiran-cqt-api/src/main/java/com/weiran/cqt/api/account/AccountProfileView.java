package com.weiran.cqt.api.account;

import org.jspecify.annotations.Nullable;

/**
 * 本人资料（适配层按 uniapp 的键名输出）。
 *
 * @param id 账号 ID
 * @param name 姓名 / 学校名称
 * @param type 账号类型
 * @param uniid 唯一标识（原系统字段）
 * @param phone 手机号
 * @param schoolId 学校编号
 * @param idCard 证件号
 * @param credentialType 证件类型展示名（「身份证号」/「其他」）
 * @param cityId 赛区编号
 * @param cityName 赛区名称，查不到为空串
 * @param sex 性别
 * @param school 学校
 * @param contact 联系人
 * @param address 地址
 * @param email 邮箱
 * @param status 审核状态：0 通过、1 审核中、2 驳回
 * @param license 营业执照 URL
 * @param commitment 承诺书 URL
 * @param rejectionReason 驳回原因
 * @param sourceDatabase 来源库
 */
public record AccountProfileView(
        long id,
        String name,
        @Nullable Integer type,
        @Nullable String uniid,
        @Nullable String phone,
        @Nullable String schoolId,
        @Nullable String idCard,
        String credentialType,
        @Nullable Integer cityId,
        String cityName,
        @Nullable Integer sex,
        @Nullable String school,
        @Nullable String contact,
        @Nullable String address,
        @Nullable String email,
        @Nullable Integer status,
        @Nullable String license,
        @Nullable String commitment,
        @Nullable String rejectionReason,
        String sourceDatabase) {}
