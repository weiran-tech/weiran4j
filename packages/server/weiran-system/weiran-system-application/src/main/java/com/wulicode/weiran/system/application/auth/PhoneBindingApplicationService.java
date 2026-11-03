package com.wulicode.weiran.system.application.auth;

import com.wulicode.weiran.framework.error.BizException;
import com.wulicode.weiran.framework.error.CommonErrors;
import com.wulicode.weiran.system.api.auth.ClientContext;
import com.wulicode.weiran.system.api.sms.SmsSendCommand;
import com.wulicode.weiran.system.api.sms.SmsSendResult;
import com.wulicode.weiran.system.api.sms.SmsService;
import com.wulicode.weiran.system.application.user.UserDuplicateErrors;
import com.wulicode.weiran.system.domain.sms.SmsSettings;
import com.wulicode.weiran.system.domain.user.UserRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.transaction.annotation.Transactional;

/** 本人手机号绑定：验证码只允许用于发码时的用户和新手机号。 */
public class PhoneBindingApplicationService {

    private static final Duration CODE_TTL = Duration.ofMinutes(5);

    private static final Duration SEND_INTERVAL = Duration.ofSeconds(60);

    private static final int MAX_ATTEMPTS = 5;

    private static final int MAX_CHALLENGES = 10_000;

    private static final int MAX_SENDS_PER_IP_PER_HOUR = 10;

    private final UserRepository users;

    private final SmsService sms;

    private final SmsSettings settings;

    private final Clock clock;

    private final SecureRandom random = new SecureRandom();

    private final Map<String, Challenge> challenges = new HashMap<>();

    private final Map<String, List<Instant>> sendsByIp = new HashMap<>();

    public PhoneBindingApplicationService(
            final UserRepository users, final SmsService sms, final SmsSettings settings, final Clock clock) {
        this.users = users;
        this.sms = sms;
        this.settings = settings;
        this.clock = clock;
    }

    /** 向待绑定的手机号发送验证码；同一用户与号码 60 秒内只能发送一次。 */
    public synchronized void sendCode(final long userId, final String rawPhone, final ClientContext client) {
        final String phone = PhoneBindingApplicationService.requirePhone(rawPhone);
        if (this.users.findById(userId).isEmpty()) {
            throw BizException.notFound("用户不存在");
        }
        if (this.users.existsByPhone(phone, userId)) {
            throw BizException.duplicate("手机号已存在");
        }
        if (!this.sms.isAvailable() || !this.settings.verificationTemplateReady()) {
            throw new BizException(CommonErrors.SERVICE_UNAVAILABLE, "短信验证码服务未配置");
        }
        final Instant now = this.clock.instant();
        this.challenges.entrySet().removeIf(entry -> !now.isBefore(entry.getValue().expiresAt));
        this.sendsByIp
                .values()
                .forEach(instants -> instants.removeIf(at -> at.isBefore(now.minus(Duration.ofHours(1)))));
        this.sendsByIp.entrySet().removeIf(entry -> entry.getValue().isEmpty());
        final List<Instant> recent = this.sendsByIp.computeIfAbsent(client.ip(), ignored -> new ArrayList<>());
        if (recent.size() >= PhoneBindingApplicationService.MAX_SENDS_PER_IP_PER_HOUR) {
            throw BizException.conflict("验证码请求过于频繁，请稍后重试");
        }
        final String key = PhoneBindingApplicationService.key(userId, phone);
        final Challenge existing = this.challenges.get(key);
        if (existing != null && now.isBefore(existing.sentAt.plus(PhoneBindingApplicationService.SEND_INTERVAL))) {
            throw BizException.conflict("验证码请求过于频繁，请稍后重试");
        }
        if (this.challenges.size() >= PhoneBindingApplicationService.MAX_CHALLENGES
                || this.sendsByIp.size() >= PhoneBindingApplicationService.MAX_CHALLENGES) {
            throw new BizException(CommonErrors.SERVICE_UNAVAILABLE, "验证码服务繁忙，请稍后重试");
        }
        final String code = String.format(Locale.ROOT, "%06d", this.random.nextInt(1_000_000));
        final SmsSendResult result = this.sms.send(
                new SmsSendCommand(phone, this.settings.verificationTemplateCode(), Map.of("code", code)));
        if (result == SmsSendResult.RATE_LIMITED) {
            throw BizException.conflict("短信发送过于频繁，请稍后重试");
        }
        if (result != SmsSendResult.SENT && result != SmsSendResult.LOGGED) {
            throw new BizException(CommonErrors.SERVICE_UNAVAILABLE, "短信发送失败，请稍后重试");
        }
        this.challenges.put(
                key,
                new Challenge(
                        PhoneBindingApplicationService.digest(userId, phone, code),
                        now,
                        now.plus(PhoneBindingApplicationService.CODE_TTL)));
        recent.add(now);
    }

    /** 校验一次性验证码并保存新手机号；失败不会修改用户资料。 */
    @Transactional
    public synchronized void confirm(final long userId, final String rawPhone, final String code) {
        final String phone = PhoneBindingApplicationService.requirePhone(rawPhone);
        final String key = PhoneBindingApplicationService.key(userId, phone);
        final Challenge challenge = this.challenges.get(key);
        final Instant now = this.clock.instant();
        if (challenge == null || !now.isBefore(challenge.expiresAt) || challenge.attempts >= MAX_ATTEMPTS) {
            this.challenges.remove(key);
            throw BizException.badRequest("验证码无效或已过期");
        }
        if (!MessageDigest.isEqual(challenge.digest, PhoneBindingApplicationService.digest(userId, phone, code))) {
            challenge.attempts++;
            if (challenge.attempts >= MAX_ATTEMPTS) {
                this.challenges.remove(key);
            }
            throw BizException.badRequest("验证码错误");
        }
        if (this.users.findById(userId).isEmpty()) {
            throw BizException.notFound("用户不存在");
        }
        if (this.users.existsByPhone(phone, userId)) {
            throw BizException.duplicate("手机号已存在");
        }
        try {
            this.users.updateVerifiedPhone(userId, phone);
        } catch (final DuplicateKeyException ex) {
            throw UserDuplicateErrors.from(ex, "手机号已存在");
        }
        this.challenges.remove(key);
    }

    private static String requirePhone(final String rawPhone) {
        final String phone = rawPhone.strip();
        if (!phone.matches("1[3-9]\\d{9}")) {
            throw BizException.badRequest("手机号格式不正确");
        }
        return phone;
    }

    private static String key(final long userId, final String phone) {
        return userId + ":" + phone;
    }

    private static byte[] digest(final long userId, final String phone, final String code) {
        try {
            return MessageDigest.getInstance("SHA-256")
                    .digest((userId + ":" + phone + ":" + code).getBytes(StandardCharsets.UTF_8));
        } catch (final NoSuchAlgorithmException ex) {
            throw new IllegalStateException("JVM 不支持 SHA-256", ex);
        }
    }

    private static final class Challenge {

        private final byte[] digest;

        private final Instant sentAt;

        private final Instant expiresAt;

        private int attempts;

        private Challenge(final byte[] digest, final Instant sentAt, final Instant expiresAt) {
            this.digest = digest;
            this.sentAt = sentAt;
            this.expiresAt = expiresAt;
        }
    }
}
