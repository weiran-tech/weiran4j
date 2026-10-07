package com.weiran.cqt.application.sms;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.weiran.cqt.api.error.CqtErrors;
import com.weiran.cqt.domain.sms.SmsCode;
import com.weiran.cqt.domain.sms.SmsCodeStore;
import com.weiran.cqt.domain.sms.SmsIpCounter;
import com.weiran.cqt.domain.sms.SmsSendOutcome;
import com.weiran.cqt.domain.sms.SmsSender;
import com.weiran.framework.error.BizException;
import com.weiran.framework.error.CommonErrors;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import org.jspecify.annotations.Nullable;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.support.StaticListableBeanFactory;

class SmsApplicationServiceTest {

    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-10-04T00:00:00Z"), ZoneOffset.UTC);

    private static final String IP = "203.0.113.9";

    /** 内存存储。 */
    private static final class MapStore implements SmsCodeStore {

        private final Map<String, SmsCode> codes = new HashMap<>();

        @Override
        public Optional<SmsCode> get(final String phone) {
            return Optional.ofNullable(this.codes.get(phone));
        }

        @Override
        public void put(final String phone, final SmsCode code) {
            this.codes.put(phone, code);
        }

        @Override
        public void remove(final String phone) {
            this.codes.remove(phone);
        }
    }

    /** 内存 IP 计数（不过期）。 */
    private static final class MapCounter implements SmsIpCounter {

        private final Map<String, Integer> counts = new HashMap<>();

        @Override
        public int sentWithinHour(final String ip) {
            return this.counts.getOrDefault(ip, 0);
        }

        @Override
        public void recordSent(final String ip) {
            this.counts.merge(ip, 1, Integer::sum);
        }
    }

    /** 按预设顺序返回结果、记录最后一个验证码的发送实现。 */
    private static final class ScriptedSender implements SmsSender {

        private final Deque<SmsSendOutcome> outcomes = new ArrayDeque<>();

        private @Nullable String lastCode;

        ScriptedSender(final SmsSendOutcome... outcomes) {
            for (final SmsSendOutcome outcome : outcomes) {
                this.outcomes.addLast(outcome);
            }
        }

        @Override
        public SmsSendOutcome send(final String phone, final String code) {
            this.lastCode = code;
            return this.outcomes.isEmpty() ? SmsSendOutcome.SENT : this.outcomes.pollFirst();
        }
    }

    private static SmsApplicationService service(
            final SmsCodeStore store, final SmsIpCounter counter, final int ipLimit, final SmsSender... senders) {
        final StaticListableBeanFactory factory = new StaticListableBeanFactory();
        for (int i = 0; i < senders.length; i++) {
            factory.addBean("sender" + i, senders[i]);
        }
        return new SmsApplicationService(
                store, factory.getBeanProvider(SmsSender.class), counter, SmsApplicationServiceTest.CLOCK, ipLimit);
    }

    private static void assertError(final Runnable action, final Object errorCode) {
        assertThatThrownBy(action::run)
                .isInstanceOfSatisfying(
                        BizException.class, ex -> assertThat(ex.getErrorCode()).isEqualTo(errorCode));
    }

    @Test
    @DisplayName("没有任何发送实现时返回「短信服务未配置」（50320），且不生成验证码")
    void notConfigured() {
        final MapStore store = new MapStore();

        SmsApplicationServiceTest.assertError(
                () -> SmsApplicationServiceTest.service(store, new MapCounter(), 10)
                        .send("15533716215", IP),
                CqtErrors.SMS_NOT_CONFIGURED);
        assertThat(store.codes).isEmpty();
    }

    @Test
    @DisplayName("发送实现不允许回显时响应不带验证码；校验通过后验证码作废")
    void sendWithoutExposeThenVerify() {
        final MapStore store = new MapStore();
        final ScriptedSender sender = new ScriptedSender();
        final SmsApplicationService service = SmsApplicationServiceTest.service(store, new MapCounter(), 10, sender);

        assertThat(service.send("15533716215", IP).code()).isNull();
        final String code = String.valueOf(sender.lastCode);
        service.verify("15533716215", code);
        assertThat(store.codes).isEmpty();
        SmsApplicationServiceTest.assertError(() -> service.verify("15533716215", code), CqtErrors.SMS_CODE_INVALID);
    }

    @Test
    @DisplayName("发送失败：验证码回滚、不占冷却、不计 IP；随后可立即重发且旧码不可用")
    void failureRollsBack() {
        final MapStore store = new MapStore();
        final MapCounter counter = new MapCounter();
        final ScriptedSender sender = new ScriptedSender(SmsSendOutcome.FAILED, SmsSendOutcome.SENT);
        final SmsApplicationService service = SmsApplicationServiceTest.service(store, counter, 10, sender);

        SmsApplicationServiceTest.assertError(() -> service.send("15533716215", IP), CqtErrors.SMS_SEND_FAILED);
        final String failedCode = String.valueOf(sender.lastCode);
        assertThat(store.codes).isEmpty();
        assertThat(counter.sentWithinHour(IP)).isZero();

        service.send("15533716215", IP);
        assertThat(counter.sentWithinHour(IP)).isEqualTo(1);
        if (!failedCode.equals(sender.lastCode)) {
            SmsApplicationServiceTest.assertError(
                    () -> service.verify("15533716215", failedCode), CqtErrors.SMS_CODE_INVALID);
        }
    }

    @Test
    @DisplayName("服务商频控 → 42920；号码非法 → 400「手机号格式不正确」")
    void mapsProviderOutcomes() {
        final SmsApplicationService service = SmsApplicationServiceTest.service(
                new MapStore(),
                new MapCounter(),
                10,
                new ScriptedSender(SmsSendOutcome.RATE_LIMITED, SmsSendOutcome.INVALID_NUMBER));

        SmsApplicationServiceTest.assertError(() -> service.send("15533716215", IP), CqtErrors.SMS_TOO_FREQUENT);
        assertThatThrownBy(() -> service.send("15533716215", IP)).isInstanceOfSatisfying(BizException.class, ex -> {
            assertThat(ex.getErrorCode()).isEqualTo(CommonErrors.BAD_REQUEST);
            assertThat(ex.getMessage()).isEqualTo("手机号格式不正确");
        });
    }

    @Test
    @DisplayName("IP 上限：同一 IP 第 4 次（上限 3）返回 42920 且不调用发送；不同 IP 不受影响；0 表示不限")
    void ipHourlyLimit() {
        final ScriptedSender sender = new ScriptedSender();
        final SmsApplicationService service =
                SmsApplicationServiceTest.service(new MapStore(), new MapCounter(), 3, sender);
        service.send("13900000001", IP);
        service.send("13900000002", IP);
        service.send("13900000003", IP);
        sender.lastCode = null;

        SmsApplicationServiceTest.assertError(() -> service.send("13900000004", IP), CqtErrors.SMS_TOO_FREQUENT);
        assertThat(sender.lastCode).isNull();
        assertThat(service.send("13900000004", "203.0.113.10").sent()).isTrue();

        final SmsApplicationService unlimited =
                SmsApplicationServiceTest.service(new MapStore(), new MapCounter(), 0, new ScriptedSender());
        for (int i = 0; i < 20; i++) {
            unlimited.send(String.format(java.util.Locale.ROOT, "1390000%04d", i), IP);
        }
    }
}
