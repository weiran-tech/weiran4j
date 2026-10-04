package com.weiran.cqt.infrastructure.sms;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class CaffeineSmsIpCounterTest {

    /** 可拨动的时钟。 */
    private static final class MutableClock extends Clock {

        private Instant now = Instant.parse("2026-10-04T00:00:00Z");

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(final ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return this.now;
        }
    }

    @Test
    @DisplayName("一小时滑动窗口：窗口内累计，满一小时的记录不再计数；不同 IP 分开计")
    void slidingHourWindow() {
        final MutableClock clock = new MutableClock();
        final CaffeineSmsIpCounter counter = new CaffeineSmsIpCounter(clock);

        assertThat(counter.sentWithinHour("a")).isZero();
        counter.recordSent("a");
        clock.now = clock.now.plus(Duration.ofMinutes(30));
        counter.recordSent("a");
        counter.recordSent("b");
        assertThat(counter.sentWithinHour("a")).isEqualTo(2);
        assertThat(counter.sentWithinHour("b")).isEqualTo(1);

        clock.now = clock.now.plus(Duration.ofMinutes(30));
        assertThat(counter.sentWithinHour("a")).isEqualTo(1);
        clock.now = clock.now.plus(Duration.ofMinutes(30));
        assertThat(counter.sentWithinHour("a")).isZero();
    }
}
