package com.weiran.cqt.domain.account;

import com.weiran.framework.error.BizException;
import java.time.LocalDate;
import java.util.Objects;
import lombok.Builder;
import lombok.Getter;
import org.jspecify.annotations.Nullable;

/**
 * 前台账号（不可变）。列口径沿用原库 {@code portal_accounts}：个人账号的 {@code idCard} 是证件号，学校账号的 {@code idCard} 存学校编号。
 */
@Getter
@Builder(toBuilder = true)
public final class Account {

    /** 密码最短长度。 */
    static final int PASSWORD_MIN_LENGTH = 6;

    /** 姓名 / 学校名称最短长度。 */
    static final int NAME_MIN_LENGTH = 2;

    private final @Nullable Long id;

    private final String sourceDatabase;

    private final long legacyUserId;

    private final String name;

    private final String passwordHash;

    private final @Nullable Integer userType;

    private final @Nullable String uniid;

    private final @Nullable String phone;

    private final @Nullable String schoolId;

    private final @Nullable String idCard;

    private final CredentialType credentialType;

    private final @Nullable Integer cityId;

    private final @Nullable Integer sex;

    private final @Nullable String school;

    private final @Nullable String contact;

    private final @Nullable String address;

    private final @Nullable String email;

    private final @Nullable Integer auditStatus;

    private final @Nullable String license;

    private final @Nullable String commitment;

    private final @Nullable String rejectionReason;

    private final int tokenVersion;

    /** 已持久化账号的 ID。 */
    public long requireId() {
        if (this.id == null) {
            throw new IllegalStateException("账号尚未持久化");
        }
        return this.id;
    }

    /** 是否个人账号。 */
    public boolean isPersonal() {
        return Objects.equals(this.userType, AccountTypes.PERSONAL);
    }

    /**
     * 校验注册表单中不依赖数据库的部分（类型、名称、手机号、密码、个人证件），返回规范化结果。
     *
     * <p>在消耗短信验证码之前调用：格式错误不应让用户白白用掉一次验证码。
     *
     * @param form 前台原始输入
     * @param today 今天
     * @return 校验后的注册信息
     */
    public static Registration validate(final RegistrationForm form, final LocalDate today) {
        final Integer type = form.type();
        if (type == null || (type != AccountTypes.PERSONAL && type != AccountTypes.SCHOOL)) {
            throw BizException.badRequest("类型格式不正确");
        }
        final String name = form.name() == null ? "" : form.name().strip();
        if (name.length() < Account.NAME_MIN_LENGTH) {
            throw BizException.badRequest("姓名/学校名称最少2个字符");
        }
        final String phone = Phones.require(form.phone());
        Account.requirePassword(form.password(), form.passwordConfirmation(), "密码至少6位且两次输入必须一致");
        if (type == AccountTypes.PERSONAL) {
            final CredentialType credentialType = CredentialType.parse(form.credentialType());
            final String credential = Credentials.requireValid(credentialType, form.idCard(), today);
            return new Registration(form, type, name, phone, credentialType, credential);
        }
        return new Registration(form, type, name, phone, CredentialType.OTHER, form.schoolId());
    }

    /**
     * 校验新密码：至少 6 位且与确认一致。
     *
     * @param password 密码
     * @param confirmation 确认密码
     * @param message 不合格时的提示语
     * @return 密码
     */
    public static String requirePassword(
            final @Nullable String password, final @Nullable String confirmation, final String message) {
        if (password == null || password.length() < Account.PASSWORD_MIN_LENGTH || !password.equals(confirmation)) {
            throw BizException.badRequest(message);
        }
        return password;
    }

    /**
     * 合并本人修改的资料。
     *
     * <p>手机号是登录名，不能在这里改：与当前不同直接拒绝。个人账号改证件时按注册规则重新校验（查重由调用方做）；
     * 学校账号在驳回状态下修改资料，自动回到审核中。
     *
     * @param changes 修改内容
     * @param today 今天
     * @return 修改后的账号
     */
    public Account applyProfileChanges(final ProfileChanges changes, final LocalDate today) {
        if (changes.phone() != null && !changes.phone().strip().equals(this.phone)) {
            throw BizException.badRequest("手机号不支持在此修改");
        }
        final AccountBuilder builder = this.toBuilder();
        if (changes.name() != null) {
            builder.name(changes.name());
        }
        if (changes.schoolId() != null) {
            builder.schoolId(changes.schoolId());
        }
        if (changes.cityId() != null) {
            builder.cityId(changes.cityId());
        }
        if (changes.sex() != null) {
            builder.sex(changes.sex());
        }
        if (changes.school() != null) {
            builder.school(changes.school());
        }
        if (changes.contact() != null) {
            builder.contact(changes.contact());
        }
        if (changes.address() != null) {
            builder.address(changes.address());
        }
        if (changes.email() != null) {
            builder.email(changes.email());
        }
        if (changes.license() != null) {
            builder.license(changes.license());
        }
        if (changes.commitment() != null) {
            builder.commitment(changes.commitment());
        }
        if (this.isPersonal()) {
            if (changes.idCard() != null || changes.credentialType() != null) {
                final CredentialType type = changes.credentialType() == null
                        ? this.credentialType
                        : CredentialType.parse(changes.credentialType());
                builder.credentialType(type)
                        .idCard(Credentials.requireValid(
                                type, changes.idCard() == null ? this.idCard : changes.idCard(), today));
            }
        } else if (changes.idCard() != null) {
            builder.idCard(changes.idCard());
        }
        if (Objects.equals(this.userType, AccountTypes.SCHOOL)
                && Objects.equals(this.auditStatus, AccountTypes.AUDIT_REJECTED)) {
            builder.auditStatus(AccountTypes.AUDIT_PENDING);
        }
        return builder.build();
    }

    /** 与另一份资料相比，证件（类型或号码）是否变了。 */
    public boolean credentialDiffersFrom(final Account other) {
        return this.credentialType != other.credentialType || !Objects.equals(this.idCard, other.idCard);
    }
}
