package com.weiran.system.domain.account;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.kjs.wuli3.core.error.ErrorCodeException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class PassportTypeTest {

    @ParameterizedTest
    @CsvSource({
        "zhangsan@example.com, EMAIL",
        "a@b.cn, EMAIL",
        "13800138000, MOBILE",
        "19912345678, MOBILE",
        "zhangsan, USERNAME",
        "12800138000, USERNAME",
        "138001380001, USERNAME",
        "1380013800, USERNAME",
    })
    @DisplayName("按内容嗅探通行证类型")
    void detectsPassportTypeByContent(final String passport, final PassportType expected) {
        assertThat(PassportType.detect(passport)).isEqualTo(expected);
    }

    @Test
    @DisplayName("null 与空白归为用户名而不是抛异常")
    void treatsBlankAsUsername() {
        assertThat(PassportType.detect(null)).isEqualTo(PassportType.USERNAME);
        assertThat(PassportType.detect("   ")).isEqualTo(PassportType.USERNAME);
    }

    @Test
    @DisplayName("账号类型按落库取值解析，未知取值抛业务异常")
    void resolvesAccountTypeFromCode() {
        assertThat(AccountType.fromCode("backend")).isEqualTo(AccountType.BACKEND);
        assertThat(AccountType.fromCode(" USER ")).isEqualTo(AccountType.USER);
        assertThatThrownBy(() -> AccountType.fromCode("admin")).isInstanceOf(ErrorCodeException.class);
    }
}
