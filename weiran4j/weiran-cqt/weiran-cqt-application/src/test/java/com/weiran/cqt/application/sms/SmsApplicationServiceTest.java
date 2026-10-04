package com.weiran.cqt.application.sms;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.weiran.common.error.BizException;
import com.weiran.cqt.api.error.CqtErrors;
import com.weiran.cqt.domain.sms.SmsCode;
import com.weiran.cqt.domain.sms.SmsCodeStore;
import com.weiran.cqt.domain.sms.SmsSender;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.support.StaticListableBeanFactory;

class SmsApplicationServiceTest {

    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-10-04T00:00:00Z"), ZoneOffset.UTC);

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

    private static SmsApplicationService service(final SmsCodeStore store, final SmsSender... senders) {
        final StaticListableBeanFactory factory = new StaticListableBeanFactory();
        for (int i = 0; i < senders.length; i++) {
            factory.addBean("sender" + i, senders[i]);
        }
        return new SmsApplicationService(
                store, factory.getBeanProvider(SmsSender.class), SmsApplicationServiceTest.CLOCK);
    }

    @Test
    @DisplayName("没有任何发送实现时返回「短信服务未配置」（50320），且不生成验证码")
    void notConfigured() {
        final MapStore store = new MapStore();

        assertThatThrownBy(() -> SmsApplicationServiceTest.service(store).send("15533716215"))
                .isInstanceOfSatisfying(
                        BizException.class,
                        ex -> assertThat(ex.getErrorCode()).isEqualTo(CqtErrors.SMS_NOT_CONFIGURED));
        assertThat(store.codes).isEmpty();
    }

    @Test
    @DisplayName("发送实现不允许回显时响应不带验证码；校验通过后验证码作废")
    void sendWithoutExposeThenVerify() {
        final MapStore store = new MapStore();
        final String[] sent = new String[1];
        final SmsApplicationService service = SmsApplicationServiceTest.service(store, (phone, code) -> sent[0] = code);

        assertThat(service.send("15533716215").code()).isNull();
        service.verify("15533716215", sent[0]);
        assertThat(store.codes).isEmpty();
        assertThatThrownBy(() -> service.verify("15533716215", sent[0]))
                .isInstanceOfSatisfying(
                        BizException.class, ex -> assertThat(ex.getErrorCode()).isEqualTo(CqtErrors.SMS_CODE_INVALID));
    }
}
