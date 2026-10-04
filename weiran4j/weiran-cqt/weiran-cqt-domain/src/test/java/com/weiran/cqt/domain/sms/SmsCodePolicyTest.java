package com.weiran.cqt.domain.sms;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.time.Instant;
import java.util.Objects;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class SmsCodePolicyTest {

    private static final Instant NOW = Instant.parse("2026-10-04T00:00:00Z");

    @Test
    @DisplayName("10 分钟有效，过期即失败")
    void expires() {
        final SmsCode code = SmsCodePolicy.issue("123456", SmsCodePolicyTest.NOW);

        assertThat(SmsCodePolicy.verify(code, "123456", SmsCodePolicyTest.NOW.plus(Duration.ofMinutes(9)))
                        .matched())
                .isTrue();
        final SmsCodePolicy.Verification expired =
                SmsCodePolicy.verify(code, "123456", SmsCodePolicyTest.NOW.plus(Duration.ofMinutes(10)));
        assertThat(expired.matched()).isFalse();
        assertThat(expired.remaining()).isNull();
        assertThat(SmsCodePolicy.verify(null, "123456", SmsCodePolicyTest.NOW).matched())
                .isFalse();
    }

    @Test
    @DisplayName("通过后不保留（一次性）；输错累计 5 次作废，之后正确码也失败")
    void oneTimeAndAttemptLimit() {
        assertThat(SmsCodePolicy.verify(
                                SmsCodePolicy.issue("123456", SmsCodePolicyTest.NOW), " 123456 ", SmsCodePolicyTest.NOW)
                        .remaining())
                .isNull();

        SmsCode stored = SmsCodePolicy.issue("123456", SmsCodePolicyTest.NOW);
        for (int i = 1; i < SmsCodePolicy.MAX_FAILED_ATTEMPTS; i++) {
            final SmsCodePolicy.Verification wrong = SmsCodePolicy.verify(stored, "000000", SmsCodePolicyTest.NOW);
            assertThat(wrong.matched()).isFalse();
            stored = Objects.requireNonNull(wrong.remaining());
            assertThat(stored.failedAttempts()).isEqualTo(i);
        }
        final SmsCodePolicy.Verification fifth = SmsCodePolicy.verify(stored, null, SmsCodePolicyTest.NOW);
        assertThat(fifth.matched()).isFalse();
        assertThat(fifth.remaining()).isNull();
        assertThat(SmsCodePolicy.verify(fifth.remaining(), "123456", SmsCodePolicyTest.NOW)
                        .matched())
                .isFalse();
    }

    @Test
    @DisplayName("同号 60 秒冷却")
    void cooldown() {
        final SmsCode code = SmsCodePolicy.issue("123456", SmsCodePolicyTest.NOW);

        assertThat(SmsCodePolicy.inCooldown(code, SmsCodePolicyTest.NOW.plusSeconds(59)))
                .isTrue();
        assertThat(SmsCodePolicy.inCooldown(code, SmsCodePolicyTest.NOW.plusSeconds(60)))
                .isFalse();
        assertThat(SmsCodePolicy.inCooldown(null, SmsCodePolicyTest.NOW)).isFalse();
    }
}
