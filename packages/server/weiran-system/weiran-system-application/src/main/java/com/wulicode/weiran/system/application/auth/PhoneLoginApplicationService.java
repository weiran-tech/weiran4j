package com.wulicode.weiran.system.application.auth;

import com.wulicode.weiran.framework.error.BizException;
import com.wulicode.weiran.framework.error.CommonErrors;
import com.wulicode.weiran.system.api.auth.ClientContext;
import com.wulicode.weiran.system.api.auth.LoginResult;
import com.wulicode.weiran.system.api.auth.SystemAuthErrors;
import com.wulicode.weiran.system.api.sms.SmsSendCommand;
import com.wulicode.weiran.system.api.sms.SmsSendResult;
import com.wulicode.weiran.system.api.sms.SmsService;
import com.wulicode.weiran.system.domain.user.User;
import com.wulicode.weiran.system.domain.user.UserRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/** 手机号验证码登录用例；验证码与频率窗口仅在进程内存中短期保存。 */
public class PhoneLoginApplicationService {

    private static final String TEMPLATE_PARAMETER = "code";

    private static final String PHONE_PATTERN = "1[3-9]\\d{9}";

    private static final Duration CODE_TTL = Duration.ofMinutes(5);

    private static final Duration PHONE_SEND_INTERVAL = Duration.ofSeconds(60);

    private static final Duration SEND_WINDOW = Duration.ofHours(1);

    private static final Duration LOGIN_WINDOW = Duration.ofMinutes(15);

    private static final int MAX_CODE_ATTEMPTS = 5;

    private static final int MAX_SENDS_PER_IP_PER_HOUR = 10;

    private static final int MAX_LOGIN_ATTEMPTS_PER_IP = 20;

    private static final int MAX_LOGIN_ATTEMPTS_PER_PHONE = 10;

    private static final int MAX_TRACKED_KEYS = 10_000;

    private final PhoneLoginSettings settings;

    private final UserRepository userRepository;

    private final SmsService smsService;

    private final AuthApplicationService authService;

    private final Clock clock;

    private final SecureRandom random = new SecureRandom();

    private final ConcurrentMap<String, Challenge> challenges = new ConcurrentHashMap<>();

    private final Map<String, LocalDateTime> lastSendByPhone = new HashMap<>();

    private final Map<String, List<LocalDateTime>> sendsByIp = new HashMap<>();

    private final Map<String, List<LocalDateTime>> loginsByIp = new HashMap<>();

    private final Map<String, List<LocalDateTime>> loginsByPhone = new HashMap<>();

    public PhoneLoginApplicationService(
            final PhoneLoginSettings settings,
            final UserRepository userRepository,
            final SmsService smsService,
            final AuthApplicationService authService,
            final Clock clock) {
        this.settings = settings;
        this.userRepository = userRepository;
        this.smsService = smsService;
        this.authService = authService;
        this.clock = clock;
    }

    /** 仅向已绑定启用账号的手机号发送登录验证码。 */
    public void sendCode(final String rawPhone, final ClientContext client) {
        this.ensureEnabled();
        final String phone = PhoneLoginApplicationService.normalizePhone(rawPhone);
        final Optional<User> found = this.userRepository.findByPhone(phone);
        if (found.isEmpty()) {
            this.challenges.remove(phone);
            throw new BizException(SystemAuthErrors.PHONE_NOT_FOUND);
        }
        if (!found.orElseThrow().isEnabled()) {
            this.challenges.remove(phone);
            throw new BizException(SystemAuthErrors.PHONE_DISABLED);
        }

        final LocalDateTime now = LocalDateTime.now(this.clock);
        this.reserveSend(phone, client.ip(), now);
        final String code = this.newCode();
        final SmsSendResult result = this.smsService.send(new SmsSendCommand(
                phone, this.settings.templateCode(), Map.of(PhoneLoginApplicationService.TEMPLATE_PARAMETER, code)));
        if (result == SmsSendResult.SENT || result == SmsSendResult.LOGGED) {
            if (result == SmsSendResult.LOGGED && this.settings.isLocalMode()) {
                this.authService.recordLocalPhoneCodeSent(found.orElseThrow(), phone, client, code);
            }
            this.challenges.put(
                    phone,
                    new Challenge(
                            PhoneLoginApplicationService.digest(phone, code),
                            now.plus(PhoneLoginApplicationService.CODE_TTL)));
            return;
        }
        this.challenges.remove(phone);
        if (result == SmsSendResult.RATE_LIMITED) {
            throw BizException.conflict("短信发送过于频繁，请稍后重试");
        }
        if (result == SmsSendResult.INVALID_NUMBER) {
            throw BizException.badRequest("手机号格式不正确");
        }
        throw new BizException(CommonErrors.SERVICE_UNAVAILABLE, "短信发送失败，请稍后重试");
    }

    /** 校验验证码并完成与密码登录相同的令牌签发、登录记录和账号状态检查。 */
    public LoginResult login(final String rawPhone, final String code, final ClientContext client) {
        this.ensureEnabled();
        final String phone = PhoneLoginApplicationService.normalizePhone(rawPhone);
        this.reserveLoginAttempt(phone, client.ip(), LocalDateTime.now(this.clock));
        final Optional<User> found = this.userRepository.findByPhone(phone);
        if (!this.consumeCode(phone, code, LocalDateTime.now(this.clock)) || found.isEmpty()) {
            this.authService.recordPhoneLoginFailure(found.map(User::getId).orElse(null), phone, client, "手机号或验证码错误");
            throw new BizException(SystemAuthErrors.BAD_CREDENTIALS, "手机号或验证码错误");
        }
        final User user = found.orElseThrow();
        if (!user.isEnabled()) {
            this.authService.recordPhoneLoginFailure(user.getId(), phone, client, "账号已禁用");
            throw new BizException(SystemAuthErrors.ACCOUNT_DISABLED);
        }
        return this.authService.completeLogin(user, client, null, "短信验证码登录成功");
    }

    private void ensureEnabled() {
        if (!this.settings.isEnabled()) {
            throw new BizException(CommonErrors.SERVICE_UNAVAILABLE, "手机号验证码登录未启用或短信配置不完整");
        }
    }

    private synchronized void reserveSend(final String phone, final String ip, final LocalDateTime now) {
        this.cleanup(now);
        final LocalDateTime lastSent = this.lastSendByPhone.get(phone);
        if (lastSent != null && now.isBefore(lastSent.plus(PhoneLoginApplicationService.PHONE_SEND_INTERVAL))) {
            throw BizException.conflict("验证码请求过于频繁，请稍后重试");
        }
        final List<LocalDateTime> recentSends = this.sendsByIp.computeIfAbsent(ip, ignored -> new ArrayList<>());
        if (recentSends.size() >= PhoneLoginApplicationService.MAX_SENDS_PER_IP_PER_HOUR) {
            throw BizException.conflict("验证码请求过于频繁，请稍后重试");
        }
        this.ensureCapacity();
        this.lastSendByPhone.put(phone, now);
        recentSends.add(now);
    }

    private synchronized void reserveLoginAttempt(final String phone, final String ip, final LocalDateTime now) {
        this.cleanup(now);
        final List<LocalDateTime> ipAttempts = this.loginsByIp.computeIfAbsent(ip, ignored -> new ArrayList<>());
        final List<LocalDateTime> phoneAttempts =
                this.loginsByPhone.computeIfAbsent(phone, ignored -> new ArrayList<>());
        if (ipAttempts.size() >= PhoneLoginApplicationService.MAX_LOGIN_ATTEMPTS_PER_IP
                || phoneAttempts.size() >= PhoneLoginApplicationService.MAX_LOGIN_ATTEMPTS_PER_PHONE) {
            throw BizException.conflict("登录尝试过于频繁，请稍后重试");
        }
        this.ensureCapacity();
        ipAttempts.add(now);
        phoneAttempts.add(now);
    }

    private synchronized boolean consumeCode(final String phone, final String code, final LocalDateTime now) {
        final Challenge challenge = this.challenges.get(phone);
        if (challenge == null) {
            return false;
        }
        if (!now.isBefore(challenge.expiresAt)
                || challenge.attempts >= PhoneLoginApplicationService.MAX_CODE_ATTEMPTS) {
            this.challenges.remove(phone, challenge);
            return false;
        }
        if (MessageDigest.isEqual(challenge.digest, PhoneLoginApplicationService.digest(phone, code))) {
            return this.challenges.remove(phone, challenge);
        }
        challenge.attempts++;
        if (challenge.attempts >= PhoneLoginApplicationService.MAX_CODE_ATTEMPTS) {
            this.challenges.remove(phone, challenge);
        }
        return false;
    }

    private synchronized void cleanup(final LocalDateTime now) {
        final LocalDateTime sendCutoff = now.minus(PhoneLoginApplicationService.SEND_WINDOW);
        final LocalDateTime loginCutoff = now.minus(PhoneLoginApplicationService.LOGIN_WINDOW);
        this.lastSendByPhone.entrySet().removeIf(entry -> entry.getValue().isBefore(sendCutoff));
        this.sendsByIp.entrySet().removeIf(entry -> {
            entry.getValue().removeIf(at -> at.isBefore(sendCutoff));
            return entry.getValue().isEmpty();
        });
        this.loginsByIp.entrySet().removeIf(entry -> {
            entry.getValue().removeIf(at -> at.isBefore(loginCutoff));
            return entry.getValue().isEmpty();
        });
        this.loginsByPhone.entrySet().removeIf(entry -> {
            entry.getValue().removeIf(at -> at.isBefore(loginCutoff));
            return entry.getValue().isEmpty();
        });
        this.challenges.entrySet().removeIf(entry -> !now.isBefore(entry.getValue().expiresAt));
    }

    private void ensureCapacity() {
        if (this.lastSendByPhone.size() > PhoneLoginApplicationService.MAX_TRACKED_KEYS
                || this.sendsByIp.size() > PhoneLoginApplicationService.MAX_TRACKED_KEYS
                || this.loginsByIp.size() > PhoneLoginApplicationService.MAX_TRACKED_KEYS
                || this.loginsByPhone.size() > PhoneLoginApplicationService.MAX_TRACKED_KEYS) {
            throw new BizException(CommonErrors.SERVICE_UNAVAILABLE, "验证码服务繁忙，请稍后重试");
        }
    }

    private String newCode() {
        final String value = Integer.toString(this.random.nextInt(1_000_000));
        return "0".repeat(6 - value.length()) + value;
    }

    private static String normalizePhone(final String rawPhone) {
        final String phone = rawPhone.strip();
        if (!phone.matches(PhoneLoginApplicationService.PHONE_PATTERN)) {
            throw BizException.badRequest("手机号格式不正确");
        }
        return phone;
    }

    private static byte[] digest(final String phone, final String code) {
        try {
            return MessageDigest.getInstance("SHA-256").digest((phone + ":" + code).getBytes(StandardCharsets.UTF_8));
        } catch (final NoSuchAlgorithmException exception) {
            throw new IllegalStateException("JVM 不支持 SHA-256", exception);
        }
    }

    private static final class Challenge {

        private final byte[] digest;

        private final LocalDateTime expiresAt;

        private int attempts;

        private Challenge(final byte[] digest, final LocalDateTime expiresAt) {
            this.digest = digest;
            this.expiresAt = expiresAt;
        }
    }
}
