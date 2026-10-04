package com.weiran.cqt.domain.account;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;
import org.jspecify.annotations.Nullable;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class AccountTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 10, 4);

    private static RegistrationForm form(
            final @Nullable Integer type, final String name, final String password, final String idCard) {
        return new RegistrationForm(
                type,
                name,
                "15533716215",
                password,
                password,
                1,
                idCard,
                "身份证号",
                15,
                "一中",
                "S01",
                "张老师",
                null,
                "a@b.c",
                "/l.png",
                "/c.pdf");
    }

    private static Account existing(final int type, final int auditStatus) {
        return Account.builder()
                .id(9L)
                .sourceDatabase("zhongxi")
                .legacyUserId(1L)
                .name("原名")
                .passwordHash("hash")
                .userType(type)
                .phone("15533716215")
                .idCard(CredentialTest.VALID_ID)
                .credentialType(CredentialType.ID_CARD)
                .auditStatus(auditStatus)
                .rejectionReason("材料不全")
                .tokenVersion(3)
                .build();
    }

    private static ProfileChanges changes(
            final @Nullable String phone,
            final @Nullable String school,
            final @Nullable String idCard,
            final @Nullable String credentialType) {
        return new ProfileChanges(
                null, phone, null, idCard, credentialType, null, null, school, null, null, null, null, null);
    }

    @Test
    @DisplayName("注册：个人审核通过、学校审核中，令牌版本 0，个人证件规范化")
    void registersWithInitialAuditStatus() {
        final Account personal = Account.validate(
                        AccountTest.form(1, " 潘跃 ", "secret1", "1309 0320 0802 2606 34"), AccountTest.TODAY)
                .toAccount("hash", 7L);
        assertThat(personal.getAuditStatus()).isEqualTo(AccountTypes.AUDIT_APPROVED);
        assertThat(personal.getName()).isEqualTo("潘跃");
        assertThat(personal.getIdCard()).isEqualTo(CredentialTest.VALID_ID);
        assertThat(personal.getUniid()).isEqualTo(CredentialTest.VALID_ID);
        assertThat(personal.getTokenVersion()).isZero();
        assertThat(personal.getSourceDatabase()).isEqualTo("zhongxi");

        final Account school = Account.validate(AccountTest.form(2, "某某中学", "secret1", "ignored"), AccountTest.TODAY)
                .toAccount("hash", 8L);
        assertThat(school.getAuditStatus()).isEqualTo(AccountTypes.AUDIT_PENDING);
        assertThat(school.getIdCard()).isEqualTo("S01");
        assertThat(school.getCredentialType()).isEqualTo(CredentialType.OTHER);
    }

    @Test
    @DisplayName("注册：类型、名称、密码校验")
    void validatesRegistration() {
        assertThatThrownBy(() -> Account.validate(AccountTest.form(3, "潘跃", "secret1", ""), AccountTest.TODAY))
                .hasMessage("类型格式不正确");
        assertThatThrownBy(() -> Account.validate(AccountTest.form(null, "潘跃", "secret1", ""), AccountTest.TODAY))
                .hasMessage("类型格式不正确");
        assertThatThrownBy(() -> Account.validate(AccountTest.form(1, " 潘 ", "secret1", ""), AccountTest.TODAY))
                .hasMessage("姓名/学校名称最少2个字符");
        assertThatThrownBy(() -> Account.validate(AccountTest.form(1, "潘跃", "12345", ""), AccountTest.TODAY))
                .hasMessage("密码至少6位且两次输入必须一致");
        assertThatThrownBy(() -> Account.requirePassword("secret1", "secret2", "x"))
                .hasMessage("x");
    }

    @Test
    @DisplayName("改资料：手机号不同拒绝、相同忽略；驳回原因与审核状态不受影响")
    void phoneCannotChange() {
        final Account account = AccountTest.existing(AccountTypes.PERSONAL, AccountTypes.AUDIT_APPROVED);
        assertThatThrownBy(() -> account.applyProfileChanges(
                        AccountTest.changes("13800000000", null, null, null), AccountTest.TODAY))
                .hasMessage("手机号不支持在此修改");

        final Account updated =
                account.applyProfileChanges(AccountTest.changes("15533716215", "新学校", null, null), AccountTest.TODAY);
        assertThat(updated.getSchool()).isEqualTo("新学校");
        assertThat(updated.getPhone()).isEqualTo("15533716215");
        assertThat(updated.getRejectionReason()).isEqualTo("材料不全");
        assertThat(updated.getAuditStatus()).isEqualTo(AccountTypes.AUDIT_APPROVED);
        assertThat(updated.credentialDiffersFrom(account)).isFalse();
    }

    @Test
    @DisplayName("改资料：个人改证件按注册规则校验；改为其他证件")
    void personalCredentialRevalidated() {
        final Account account = AccountTest.existing(AccountTypes.PERSONAL, AccountTypes.AUDIT_APPROVED);
        assertThatThrownBy(() -> account.applyProfileChanges(
                        AccountTest.changes(null, null, "130903200802260635", null), AccountTest.TODAY))
                .hasMessage("身份证号校验位错误");

        final Account updated =
                account.applyProfileChanges(AccountTest.changes(null, null, "h123", "其他"), AccountTest.TODAY);
        assertThat(updated.getCredentialType()).isEqualTo(CredentialType.OTHER);
        assertThat(updated.getIdCard()).isEqualTo("H123");
        assertThat(updated.credentialDiffersFrom(account)).isTrue();
    }

    @Test
    @DisplayName("改资料：驳回的学校回到审核中，审核中 / 通过的不变")
    void rejectedSchoolBackToPending() {
        assertThat(AccountTest.existing(AccountTypes.SCHOOL, AccountTypes.AUDIT_REJECTED)
                        .applyProfileChanges(AccountTest.changes(null, "学校", "S99", null), AccountTest.TODAY)
                        .getAuditStatus())
                .isEqualTo(AccountTypes.AUDIT_PENDING);
        assertThat(AccountTest.existing(AccountTypes.SCHOOL, AccountTypes.AUDIT_APPROVED)
                        .applyProfileChanges(AccountTest.changes(null, "学校", null, null), AccountTest.TODAY)
                        .getAuditStatus())
                .isEqualTo(AccountTypes.AUDIT_APPROVED);
        assertThat(AccountTest.existing(AccountTypes.PERSONAL, AccountTypes.AUDIT_REJECTED)
                        .applyProfileChanges(AccountTest.changes(null, "学校", null, null), AccountTest.TODAY)
                        .getAuditStatus())
                .isEqualTo(AccountTypes.AUDIT_REJECTED);
    }

    @Test
    @DisplayName("未持久化的账号取 ID 抛异常")
    void requireIdOnTransient() {
        final Account transientAccount = Account.validate(AccountTest.form(2, "某某中学", "secret1", ""), AccountTest.TODAY)
                .toAccount("hash", 1L);
        assertThatThrownBy(transientAccount::requireId).isInstanceOf(IllegalStateException.class);
        assertThat(AccountTest.existing(1, 0).requireId()).isEqualTo(9L);
    }
}
