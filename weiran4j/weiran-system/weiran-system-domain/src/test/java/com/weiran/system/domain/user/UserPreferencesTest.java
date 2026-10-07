package com.weiran.system.domain.user;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.weiran.framework.error.BizException;
import com.weiran.framework.error.CommonErrors;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class UserPreferencesTest {

    private static String objectOfBytes(final int bytes) {
        // {"k":"xxx"} 的固定开销是 8 字节。
        return "{\"k\":\"" + "x".repeat(bytes - 8) + "\"}";
    }

    @Test
    @DisplayName("恰好 16KB 通过，多 1 字节抛 40000")
    void enforcesSizeLimitAtBoundary() {
        assertThatCode(() -> UserPreferences.validateSize(UserPreferencesTest.objectOfBytes(UserPreferences.MAX_BYTES)))
                .doesNotThrowAnyException();
        assertThatThrownBy(() ->
                        UserPreferences.validateSize(UserPreferencesTest.objectOfBytes(UserPreferences.MAX_BYTES + 1)))
                .isInstanceOfSatisfying(
                        BizException.class, ex -> assertThat(ex.getErrorCode()).isEqualTo(CommonErrors.BAD_REQUEST));
    }

    @Test
    @DisplayName("按 UTF-8 字节数而不是字符数计算：多字节字符更早超限")
    void countsUtf8Bytes() {
        // 6000 个汉字 = 18000 字节，字符数却远小于 16384。
        assertThatThrownBy(() -> UserPreferences.validateSize("{\"k\":\"" + "汉".repeat(6000) + "\"}"))
                .isInstanceOf(BizException.class)
                .hasMessageContaining("16KB");
    }
}
