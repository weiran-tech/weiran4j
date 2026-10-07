package com.weiran.cqt.domain.account;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.weiran.framework.error.BizException;
import java.time.LocalDate;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class CredentialTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 10, 4);

    /** 校验位正确的测试身份证号（出生 2008-02-26）。 */
    static final String VALID_ID = "130903200802260634";

    @Test
    @DisplayName("身份证：去空白、转大写后校验通过")
    void acceptsValidIdCard() {
        assertThat(Credentials.requireValid(CredentialType.ID_CARD, " 1309 0320 0802 2606 34 ", CredentialTest.TODAY))
                .isEqualTo(CredentialTest.VALID_ID);
        assertThat(Credentials.requireValid(CredentialType.ID_CARD, "11010519491231002x", CredentialTest.TODAY))
                .isEqualTo("11010519491231002X");
    }

    @Test
    @DisplayName("身份证：长度、出生日期、校验位逐条报错")
    void rejectsInvalidIdCard() {
        assertThatThrownBy(() -> Credentials.requireValid(CredentialType.ID_CARD, "12345", CredentialTest.TODAY))
                .isInstanceOf(BizException.class)
                .hasMessage("身份证号必须是18位有效号码");
        assertThatThrownBy(() ->
                        Credentials.requireValid(CredentialType.ID_CARD, "130903200802300634", CredentialTest.TODAY))
                .hasMessage("身份证号出生日期无效");
        assertThatThrownBy(() ->
                        Credentials.requireValid(CredentialType.ID_CARD, "130903203002260634", CredentialTest.TODAY))
                .hasMessage("身份证号出生日期超出合理范围");
        assertThatThrownBy(() ->
                        Credentials.requireValid(CredentialType.ID_CARD, "130903200802260635", CredentialTest.TODAY))
                .hasMessage("身份证号校验位错误");
        assertThatThrownBy(() -> Credentials.requireValid(CredentialType.ID_CARD, "  ", CredentialTest.TODAY))
                .hasMessage("证件号不能为空");
    }

    @Test
    @DisplayName("其他证件：只限长度")
    void otherCredentialLimitsLength() {
        assertThat(Credentials.requireValid(CredentialType.OTHER, "h 1234567", CredentialTest.TODAY))
                .isEqualTo("H1234567");
        assertThatThrownBy(() -> Credentials.requireValid(CredentialType.OTHER, "a".repeat(201), CredentialTest.TODAY))
                .hasMessage("其他证件号不能超过200个字符");
    }

    @Test
    @DisplayName("证件类型别名，空值视为身份证，其它值报错")
    void parsesCredentialType() {
        assertThat(CredentialType.parse("身份证号")).isEqualTo(CredentialType.ID_CARD);
        assertThat(CredentialType.parse("身份证")).isEqualTo(CredentialType.ID_CARD);
        assertThat(CredentialType.parse("id_card")).isEqualTo(CredentialType.ID_CARD);
        assertThat(CredentialType.parse(null)).isEqualTo(CredentialType.ID_CARD);
        assertThat(CredentialType.parse("其他")).isEqualTo(CredentialType.OTHER);
        assertThat(CredentialType.parse("OTHER")).isEqualTo(CredentialType.OTHER);
        assertThatThrownBy(() -> CredentialType.parse("护照")).hasMessage("身份类型只允许填写“身份证号”或“其他”");
        assertThat(CredentialType.ofStored("OTHER")).isEqualTo(CredentialType.OTHER);
        assertThat(CredentialType.ofStored(null)).isEqualTo(CredentialType.ID_CARD);
    }

    @Test
    @DisplayName("手机号：11 位数字；掩码保留前 3 后 4")
    void phoneRules() {
        assertThat(Phones.require(" 15533716215 ")).isEqualTo("15533716215");
        assertThatThrownBy(() -> Phones.require("1553371621a")).hasMessage("手机号格式不正确");
        assertThatThrownBy(() -> Phones.require(null)).hasMessage("手机号格式不正确");
        assertThat(Phones.mask("15533716215")).isEqualTo("155****6215");
        assertThat(Phones.mask("123")).isEqualTo("****");
    }
}
