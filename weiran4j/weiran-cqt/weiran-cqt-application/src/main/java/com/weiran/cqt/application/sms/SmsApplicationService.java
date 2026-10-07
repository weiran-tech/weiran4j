package com.weiran.cqt.application.sms;

import com.weiran.cqt.api.error.CqtErrors;
import com.weiran.cqt.api.sms.SmsSendResult;
import com.weiran.cqt.api.sms.SmsService;
import com.weiran.cqt.domain.account.Phones;
import com.weiran.cqt.domain.sms.SmsCodePolicy;
import com.weiran.cqt.domain.sms.SmsCodeStore;
import com.weiran.cqt.domain.sms.SmsIpCounter;
import com.weiran.cqt.domain.sms.SmsSendOutcome;
import com.weiran.cqt.domain.sms.SmsSender;
import com.weiran.framework.error.BizException;
import com.weiran.framework.error.CommonErrors;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Instant;
import java.util.Locale;
import lombok.extern.slf4j.Slf4j;
import org.jspecify.annotations.Nullable;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;

/**
 * {@link SmsService} 实现。发送与校验都是「读 → 判断 → 写」，按实例串行化，避免并发请求绕过冷却、IP 上限或让同一验证码用两次
 * （单实例部署；多实例时连同存储、IP 计数一起换成共享实现）。
 *
 * <p>发送失败时删除刚生成的验证码：用户没收到短信，不该被 60 秒冷却挡住；失败也不计入 IP 上限（服务商只对成功发送计费）。
 */
@Slf4j
public class SmsApplicationService implements SmsService {

    private static final int CODE_BOUND = 1_000_000;

    private final SmsCodeStore codeStore;

    private final ObjectProvider<SmsSender> senders;

    private final SmsIpCounter ipCounter;

    private final Clock clock;

    private final int ipHourlyLimit;

    private final SecureRandom random = new SecureRandom();

    /**
     * 构造服务；没有任何 {@link SmsSender} 时发送一律返回「短信服务未配置」。
     *
     * @param ipHourlyLimit 同一客户端 IP 每小时最多成功发送的条数，0 表示不限
     */
    public SmsApplicationService(
            final SmsCodeStore codeStore,
            final ObjectProvider<SmsSender> senders,
            final SmsIpCounter ipCounter,
            final Clock clock,
            @Value("${weiran.cqt.sms.ip-hourly-limit:10}") final int ipHourlyLimit) {
        this.codeStore = codeStore;
        this.senders = senders;
        this.ipCounter = ipCounter;
        this.clock = clock;
        this.ipHourlyLimit = ipHourlyLimit;
    }

    @Override
    public synchronized SmsSendResult send(final @Nullable String rawPhone, final String clientIp) {
        final String phone = Phones.require(rawPhone);
        final SmsSender sender = this.senders.getIfAvailable();
        if (sender == null) {
            throw new BizException(CqtErrors.SMS_NOT_CONFIGURED);
        }
        final Instant now = this.clock.instant();
        if (SmsCodePolicy.inCooldown(this.codeStore.get(phone).orElse(null), now)) {
            throw new BizException(CqtErrors.SMS_TOO_FREQUENT);
        }
        if (SmsCodePolicy.ipLimitReached(this.ipCounter.sentWithinHour(clientIp), this.ipHourlyLimit)) {
            SmsApplicationService.log.warn("短信发送达到 IP 上限 ip={} phone={}", clientIp, Phones.mask(phone));
            throw new BizException(CqtErrors.SMS_TOO_FREQUENT);
        }
        final String code = String.format(Locale.ROOT, "%06d", this.random.nextInt(SmsApplicationService.CODE_BOUND));
        this.codeStore.put(phone, SmsCodePolicy.issue(code, now));
        final SmsSendOutcome outcome = sender.send(phone, code);
        if (outcome != SmsSendOutcome.SENT) {
            this.codeStore.remove(phone);
            throw switch (outcome) {
                case RATE_LIMITED -> new BizException(CqtErrors.SMS_TOO_FREQUENT);
                case INVALID_NUMBER -> new BizException(CommonErrors.BAD_REQUEST, "手机号格式不正确");
                default -> new BizException(CqtErrors.SMS_SEND_FAILED);
            };
        }
        this.ipCounter.recordSent(clientIp);
        SmsApplicationService.log.info("已发送短信验证码 phone={} ip={}", Phones.mask(phone), clientIp);
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
