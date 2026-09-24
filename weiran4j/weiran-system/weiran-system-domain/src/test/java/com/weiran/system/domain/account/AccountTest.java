package com.weiran.system.domain.account;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.kjs.wuli3.core.error.ErrorCodeException;
import com.weiran.system.domain.error.SystemErrors;
import java.time.LocalDateTime;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class AccountTest {

    private static final LocalDateTime NOW = LocalDateTime.of(2026, 9, 3, 12, 0);

    @Test
    @DisplayName("启用且未封禁的账号可以登录")
    void enabledAccountPassesLoginCheck() {
        assertThat(AccountTest.enabledAccount().build().isWithinBanWindow(AccountTest.NOW))
                .isFalse();
        AccountTest.enabledAccount().build().ensureLoginable(AccountTest.NOW);
    }

    @Test
    @DisplayName("永久禁用的账号抛出禁用错误并带上禁用原因")
    void disabledAccountThrowsWithReason() {
        final Account account = AccountTest.enabledAccount()
                .enabled(false)
                .disableReason("恶意刷单")
                .build();

        assertThatThrownBy(() -> account.ensureLoginable(AccountTest.NOW))
                .isInstanceOf(ErrorCodeException.class)
                .hasMessage("恶意刷单")
                .extracting(error -> ((ErrorCodeException) error).getErrorCode())
                .isEqualTo(SystemErrors.ACCOUNT_DISABLED);
    }

    @Test
    @DisplayName("限期封禁窗口内的账号即使 enabled 为真也不能登录")
    void bannedAccountCannotLoginEvenWhenEnabled() {
        final Account account = AccountTest.enabledAccount()
                .disableStartAt(AccountTest.NOW.minusDays(1))
                .disableEndAt(AccountTest.NOW.plusDays(1))
                .build();

        assertThat(account.isEnabled()).isTrue();
        assertThatThrownBy(() -> account.ensureLoginable(AccountTest.NOW))
                .isInstanceOf(ErrorCodeException.class)
                .extracting(error -> ((ErrorCodeException) error).getErrorCode())
                .isEqualTo(SystemErrors.ACCOUNT_BANNED);
    }

    @Test
    @DisplayName("封禁窗口已过期不再拦截")
    void expiredBanWindowDoesNotBlock() {
        final Account account = AccountTest.enabledAccount()
                .disableStartAt(AccountTest.NOW.minusDays(10))
                .disableEndAt(AccountTest.NOW.minusDays(5))
                .build();

        account.ensureLoginable(AccountTest.NOW);
    }

    @Test
    @DisplayName("展示名按用户名、手机号、邮箱、账号 ID 依次回落")
    void displayNameFallsBackInOrder() {
        assertThat(AccountTest.enabledAccount().build().displayName()).isEqualTo("zhangsan");
        assertThat(AccountTest.enabledAccount().username("").build().displayName())
                .isEqualTo("13800138000");
        assertThat(AccountTest.enabledAccount().username("").mobile("").build().displayName())
                .isEqualTo("zhangsan@example.com");
        assertThat(AccountTest.enabledAccount()
                        .username("")
                        .mobile("")
                        .email("")
                        .build()
                        .displayName())
                .isEqualTo("7");
    }

    private static Account.AccountBuilder enabledAccount() {
        return Account.builder()
                .id(7L)
                .username("zhangsan")
                .mobile("13800138000")
                .email("zhangsan@example.com")
                .type(AccountType.BACKEND)
                .enabled(true)
                .disableReason("")
                .loginTimes(0)
                .createdAt(AccountTest.NOW.minusYears(1));
    }
}
