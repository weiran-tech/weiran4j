package com.wulicode.weiran.platform.domain.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.wulicode.weiran.framework.error.BizException;
import com.wulicode.weiran.framework.error.CommonErrors;
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
    @DisplayName("按类型拒绝非法值并返回 100001")
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
    @DisplayName("视频配置字段接受字符串值和上传类型组合")
    void acceptsVideoUploadField() {
        assertThatCode(() -> SystemConfig.builder()
                        .configKey("system.general.intro_video")
                        .configValue("/uploads/intro.mp4")
                        .configType(ConfigType.STRING)
                        .groupKey("general")
                        .fieldType("video")
                        .fieldOptions("[\"image\",\"video\"]")
                        .required(false)
                        .builtin(false)
                        .build()
                        .validated(ConfigTypeTest.JSON))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("内置配置键不可改、不可删，修改时按新类型校验值")
    void protectsBuiltinConfig() {
        final SystemConfig builtin = SystemConfig.builder()
                .id(1L)
                .configKey("system.general.title")
                .configValue("Weiran Admin")
                .configType(ConfigType.STRING)
                .groupKey("general")
                .fieldType("input")
                .required(true)
                .builtin(true)
                .build();

        assertThatThrownBy(() -> builtin.withDetails(
                        "other", "x", ConfigType.STRING, "general", "input", null, true, null, ConfigTypeTest.JSON))
                .isInstanceOfSatisfying(
                        BizException.class, ex -> assertThat(ex.getErrorCode()).isEqualTo(CommonErrors.CONFLICT));
        assertThatThrownBy(builtin::ensureDeletable).hasMessage("内置配置不可删除");
        assertThatThrownBy(() -> builtin.withDetails(
                        "system.general.title",
                        "abc",
                        ConfigType.NUMBER,
                        "general",
                        "number",
                        null,
                        true,
                        null,
                        ConfigTypeTest.JSON))
                .hasMessageStartingWith("configValue");
        final SystemConfig updated = builtin.withDetails(
                "system.general.title",
                "新标题",
                ConfigType.STRING,
                "general",
                "input",
                null,
                true,
                "系统标题",
                ConfigTypeTest.JSON);
        assertThat(updated.getConfigValue()).isEqualTo("新标题");
        assertThat(updated.requireId()).isEqualTo(1L);
        assertThat(SystemConfig.isPublicKey("system.general.title")).isTrue();
        assertThat(SystemConfig.isPublicKey("system.general.other")).isFalse();
        assertThat(SystemConfig.isPublicKey("system.site.title")).isFalse();
        assertThat(SystemConfig.isPublicKey("sys.secret")).isFalse();
        assertThatCode(() -> SystemConfig.builder()
                        .configKey("sms.general.sign_name")
                        .configValue("开发签名")
                        .configType(ConfigType.STRING)
                        .groupKey("general")
                        .fieldType("input")
                        .required(false)
                        .builtin(true)
                        .build()
                        .validated(ConfigTypeTest.JSON))
                .doesNotThrowAnyException();
        assertThatCode(() -> builtin.toBuilder().builtin(false).build().ensureDeletable())
                .doesNotThrowAnyException();
    }
}
