package com.weiran.cqt.application.sms;

import com.weiran.common.error.BizException;
import com.weiran.cqt.api.error.CqtErrors;
import com.weiran.cqt.api.sms.SmsSendResult;
import com.weiran.cqt.api.sms.SmsService;
import com.weiran.cqt.domain.account.Phones;
import com.weiran.cqt.domain.sms.SmsCodePolicy;
import com.weiran.cqt.domain.sms.SmsCodeStore;
import com.weiran.cqt.domain.sms.SmsSender;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.util.Locale;
import lombok.extern.slf4j.Slf4j;
import org.jspecify.annotations.Nullable;
import org.springframework.beans.factory.ObjectProvider;

/**
 * {@link SmsService} 实现。发送与校验都是「读 → 判断 → 写」，按实例串行化，避免并发请求绕过冷却或让同一验证码用两次
 * （单实例部署；多实例时连同存储一起换成共享实现）。
 */
@Slf4j
public class SmsApplicationService implements SmsService {

    private static final int CODE_BOUND = 1_000_000;

    private final SmsCodeStore codeStore;

    private final ObjectProvider<SmsSender> senders;

    private final Clock clock;

    private final SecureRandom random = new SecureRandom();

    /** 构造服务；没有任何 {@link SmsSender} 时发送一律返回「短信服务未配置」。 */
    public SmsApplicationService(
            final SmsCodeStore codeStore, final ObjectProvider<SmsSender> senders, final Clock clock) {
        this.codeStore = codeStore;
        this.senders = senders;
        this.clock = clock;
    }

    @Override
    public synchronized SmsSendResult send(final @Nullable String rawPhone) {
        final String phone = Phones.require(rawPhone);
        final SmsSender sender = this.senders.getIfAvailable();
        if (sender == null) {
            throw new BizException(CqtErrors.SMS_NOT_CONFIGURED);
        }
        final Instant now = this.clock.instant();
        if (SmsCodePolicy.inCooldown(this.codeStore.get(phone).orElse(null), now)) {
            throw new BizException(CqtErrors.SMS_TOO_FREQUENT);
        }
        final String code = String.format(Locale.ROOT, "%06d", this.random.nextInt(SmsApplicationService.CODE_BOUND));
        this.codeStore.put(phone, SmsCodePolicy.issue(code, now));
        sender.send(phone, code);
        SmsApplicationService.log.info("已发送短信验证码 phone={}", Phones.mask(phone));
        return new SmsSendResult(true, sender.exposesCode() ? code : null);
    }

    @Override
    public synchronized void verify(final String phone, final @Nullable String code) {
        final SmsCodePolicy.Verification verification =
                SmsCodePolicy.verify(this.codeStore.get(phone).orElse(null), code, this.clock.instant());
        if (verification.remaining() == null) {
            this.codeStore.remove(phone);
        } else {
            this.codeStore.put(phone, verification.remaining());
        }
        if (!verification.matched()) {
            throw new BizException(CqtErrors.SMS_CODE_INVALID);
        }
    }
}
