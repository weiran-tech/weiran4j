package com.weiran.platform.domain.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.weiran.common.error.BizException;
import com.weiran.common.error.CommonErrors;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class ConfigTypeTest {

    /** 测试用 JSON 校验：只认对象与数组的外壳，足够区分合法与非法样例。 */
    private static final JsonSyntax JSON =
            text -> (text.startsWith("{") && text.endsWith("}")) || (text.startsWith("[") && text.endsWith("]"));

    @ParameterizedTest
    @CsvSource(
            delimiter = '|',
            value = {
                "string|任意文本",
                "number|42",
                "number|-3.14",
                "number|1e3",
                "boolean|true",
                "boolean|false",
                "json|{\"a\":1}",
                "json|[1,2]"
            })
    @DisplayName("按类型接受合法值")
    void acceptsValidValues(final String type, final String value) {
        assertThatCode(() -> ConfigType.of(type).validate(value, ConfigTypeTest.JSON))
                .doesNotThrowAnyException();
    }

    @ParameterizedTest
    @CsvSource(
            delimiter = '|',
            value = {"number|abc", "number|1,5", "boolean|TRUE", "boolean|1", "json|not-json"})
    @DisplayName("按类型拒绝非法值并返回 40000")
    void rejectsInvalidValues(final String type, final String value) {
        assertThatThrownBy(() -> ConfigType.of(type).validate(value, ConfigTypeTest.JSON))
                .isInstanceOfSatisfying(
                        BizException.class, ex -> assertThat(ex.getErrorCode()).isEqualTo(CommonErrors.BAD_REQUEST))
                .hasMessageStartingWith("configValue: ");
    }

    @Test
    @DisplayName("空数字串与未知类型被拒绝")
    void rejectsBlankNumberAndUnknownType() {
        assertThatThrownBy(() -> ConfigType.NUMBER.validate("", ConfigTypeTest.JSON))
                .isInstanceOf(BizException.class);
        assertThatThrownBy(() -> ConfigType.of("yaml")).isInstanceOf(BizException.class);
        assertThat(ConfigType.JSON.value()).isEqualTo("json");
    }

    @Test
    @DisplayName("内置配置键不可改、不可删，修改时按新类型校验值")
    void protectsBuiltinConfig() {
        final SystemConfig builtin = SystemConfig.builder()
                .id(1L)
                .configKey("sys.site.title")
                .configValue("Weiran Admin")
                .configType(ConfigType.STRING)
                .builtin(true)
                .build();

        assertThatThrownBy(() -> builtin.withDetails("other", "x", ConfigType.STRING, null, ConfigTypeTest.JSON))
                .isInstanceOfSatisfying(
                        BizException.class, ex -> assertThat(ex.getErrorCode()).isEqualTo(CommonErrors.CONFLICT));
        assertThatThrownBy(builtin::ensureDeletable).hasMessage("内置配置不可删除");
        assertThatThrownBy(() ->
                        builtin.withDetails("sys.site.title", "abc", ConfigType.NUMBER, null, ConfigTypeTest.JSON))
                .hasMessageStartingWith("configValue");
        final SystemConfig updated =
                builtin.withDetails("sys.site.title", "新标题", ConfigType.STRING, "站点标题", ConfigTypeTest.JSON);
        assertThat(updated.getConfigValue()).isEqualTo("新标题");
        assertThat(updated.requireId()).isEqualTo(1L);
        assertThat(SystemConfig.isPublicKey("sys.site.title")).isTrue();
        assertThat(SystemConfig.isPublicKey("sys.secret")).isFalse();
        assertThatCode(() -> builtin.toBuilder().builtin(false).build().ensureDeletable())
                .doesNotThrowAnyException();
    }
}
