package com.weiran.cqt.domain.account;

import org.jspecify.annotations.Nullable;

/**
 * 校验通过的注册信息。
 *
 * @param form 原始表单（取其余选填字段）
 * @param type 账号类型
 * @param name 去空白后的名称
 * @param phone 手机号
 * @param credentialType 证件类型（学校账号固定为其他）
 * @param credential 规范化后的证件号（个人）或学校编号（学校）
 */
public record Registration(
        RegistrationForm form,
        int type,
        String name,
        String phone,
        CredentialType credentialType,
        @Nullable String credential) {

    /** 是否个人账号。 */
    public boolean isPersonal() {
        return this.type == AccountTypes.PERSONAL;
    }

    /**
     * 生成待插入的账号：个人审核通过，学校审核中；令牌版本从 0 开始。
     *
     * @param passwordHash 密码哈希
     * @param legacyUserId 来源库内的用户编号
     * @return 账号
     */
    public Account toAccount(final String passwordHash, final long legacyUserId) {
        return Account.builder()
                .sourceDatabase(AccountTypes.SOURCE_ZHONGXI)
                .legacyUserId(legacyUserId)
                .name(this.name)
                .passwordHash(passwordHash)
                .userType(this.type)
                .uniid(this.isPersonal() ? this.credential : this.form.schoolId())
                .phone(this.phone)
                .schoolId(this.form.schoolId())
                .idCard(this.credential)
                .credentialType(this.credentialType)
                .cityId(this.form.cityId())
                .sex(this.form.sex())
                .school(this.form.school())
                .contact(this.form.contact())
                .address(this.form.address())
                .email(this.form.email())
                .auditStatus(this.isPersonal() ? AccountTypes.AUDIT_APPROVED : AccountTypes.AUDIT_PENDING)
                .license(this.form.license())
                .commitment(this.form.commitment())
                .tokenVersion(0)
                .build();
    }
}
