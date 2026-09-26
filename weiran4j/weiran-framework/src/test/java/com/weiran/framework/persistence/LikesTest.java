package com.weiran.framework.persistence;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class LikesTest {

    @Test
    @DisplayName("LIKE 通配符与转义符被转义，普通文本不变")
    void escapesWildcards() {
        assertThat(Likes.escape("50%_a\\b")).isEqualTo("50\\%\\_a\\\\b");
        assertThat(Likes.escape("张三")).isEqualTo("张三");
        assertThat(Likes.escape(null)).isNull();
    }
}
