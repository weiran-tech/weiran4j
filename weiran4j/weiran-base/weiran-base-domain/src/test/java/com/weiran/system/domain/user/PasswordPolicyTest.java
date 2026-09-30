package com.weiran.system.domain.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.weiran.common.error.BizException;
import com.weiran.common.error.CommonErrors;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class PasswordPolicyTest {

    @ParameterizedTest
    @ValueSource(strings = {"abcdefg1", "ABCDEFG1", "admin123", "P@ssw0rd!"})
    @DisplayName("8 位以上且同时含字母与数字的密码通过")
    void acceptsStrongPasswords(final String password) {
        assertThat(PasswordPolicy.isAcceptable(password)).isTrue();
    }

    @ParameterizedTest
    @ValueSource(strings = {"abc123", "abcdefgh", "12345678", "密码密码密码密码1"})
    @DisplayName("过短、缺字母或缺数字的密码被拒绝")
    void rejectsWeakPasswords(final String password) {
        assertThat(PasswordPolicy.isAcceptable(password)).isFalse();
    }

    @Test
    @DisplayName("超过 64 位被拒绝，64 位边界通过")
    void enforcesMaxLength() {
        assertThat(PasswordPolicy.isAcceptable("a1".repeat(32))).isTrue();
        assertThat(PasswordPolicy.isAcceptable("a1".repeat(32) + "x")).isFalse();
    }

    @Test
    @DisplayName("校验失败抛 40000，message 带字段名")
    void validateThrowsBadRequest() {
        assertThatThrownBy(() -> PasswordPolicy.validate("newPassword", "short"))
                .isInstanceOfSatisfying(
                        BizException.class, ex -> assertThat(ex.getErrorCode()).isEqualTo(CommonErrors.BAD_REQUEST))
                .hasMessageStartingWith("newPassword: ");
    }
}
