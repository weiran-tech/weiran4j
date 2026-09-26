package com.weiran.common.error;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.weiran.common.status.EnableStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class EnableStatusTest {

    @Test
    @DisplayName("按小写字符串解析状态，非法值抛 40000，空值走默认或不过滤")
    void parsesStatus() {
        assertThat(EnableStatus.of("enabled")).isEqualTo(EnableStatus.ENABLED);
        assertThat(EnableStatus.DISABLED.value()).isEqualTo("disabled");
        assertThat(EnableStatus.ofNullable(null, EnableStatus.ENABLED)).isEqualTo(EnableStatus.ENABLED);
        assertThat(EnableStatus.ofNullable("disabled", EnableStatus.ENABLED)).isEqualTo(EnableStatus.DISABLED);
        assertThat(EnableStatus.filterOf(" ")).isNull();
        assertThat(EnableStatus.filterOf("enabled")).isEqualTo(EnableStatus.ENABLED);
        assertThatThrownBy(() -> EnableStatus.of("ENABLED"))
                .isInstanceOfSatisfying(
                        BizException.class, ex -> assertThat(ex.getErrorCode()).isEqualTo(CommonErrors.BAD_REQUEST));
    }
}
