package com.weiran.cqt.domain.account;

/** 账号类型与审核状态取值（沿用原系统与 uniapp 的数字口径）。 */
public final class AccountTypes {

    /** 个人（学生）账号。 */
    public static final int PERSONAL = 1;

    /** 学校 / 机构账号。 */
    public static final int SCHOOL = 2;

    /** 审核通过。 */
    public static final int AUDIT_APPROVED = 0;

    /** 审核中。 */
    public static final int AUDIT_PENDING = 1;

    /** 审核驳回。 */
    public static final int AUDIT_REJECTED = 2;

    /** 新注册账号的来源库标记（沿用原 FastAPI：新账号记在 zhongxi 名下）。 */
    public static final String SOURCE_ZHONGXI = "zhongxi";

    private AccountTypes() {}
}
