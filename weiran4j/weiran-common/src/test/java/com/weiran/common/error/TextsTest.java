package com.weiran.common.error;

import static org.assertj.core.api.Assertions.assertThat;

import com.weiran.common.text.Texts;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class TextsTest {

    @Test
    @DisplayName("可选文本去空白后为空视为未填，截断按长度")
    void normalizesText() {
        assertThat(Texts.trimToNull("  ")).isNull();
        assertThat(Texts.trimToNull(null)).isNull();
        assertThat(Texts.trimToNull(" a ")).isEqualTo("a");
        assertThat(Texts.trimToEmpty(null)).isEmpty();
        assertThat(Texts.trimToEmpty(" b ")).isEqualTo("b");
        assertThat(Texts.truncate("abcdef", 3)).isEqualTo("abc");
        assertThat(Texts.truncate("ab", 3)).isEqualTo("ab");
    }
}
