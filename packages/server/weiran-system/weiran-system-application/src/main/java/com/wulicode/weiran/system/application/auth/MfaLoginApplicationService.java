package com.wulicode.weiran.system.application.auth;

import com.wulicode.weiran.framework.error.BizException;
import com.wulicode.weiran.framework.error.CommonErrors;
import com.wulicode.weiran.system.api.auth.ClientContext;
import com.wulicode.weiran.system.api.auth.ExternalLoginCandidate;
import com.wulicode.weiran.system.api.auth.LoginCommand;
import com.wulicode.weiran.system.api.auth.LoginResult;
import com.wulicode.weiran.system.api.sms.SmsSendCommand;
import com.wulicode.weiran.system.api.sms.SmsSendResult;
import com.wulicode.weiran.system.api.sms.SmsService;
import com.wulicode.weiran.system.domain.auth.TrustedDeviceTokens;
import com.wulicode.weiran.system.domain.user.SecuritySettings;
import com.wulicode.weiran.system.domain.user.SecuritySettingsRepository;
import com.wulicode.weiran.system.domain.user.User;
import com.wulicode.weiran.system.domain.user.UserRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import org.jspecify.annotations.Nullable;

/** 密码登录与外部登录的手机二次验证；正式访问令牌仅在验证完成后交付。 */
public class MfaLoginApplicationService {

    private static final Duration CHALLENGE_TTL = Duration.ofMinutes(5);

    private static final Duration SEND_INTERVAL = Duration.ofSeconds(60);

    private static final int MAX_ATTEMPTS = 5;

    private static final int MAX_CHALLENGES = 10_000;

    private final AuthApplicationService authService;

    private final UserRepository users;

    private final SecuritySettingsRepository settings;

    private final TrustedDeviceTokens trustedDevices;

    private final SmsService smsService;

    private final PhoneLoginSettings phoneSettings;

    private final Clock clock;

    private final SecureRandom random = new SecureRandom();

    private final ConcurrentMap<String, Challenge> challenges = new ConcurrentHashMap<>();

    private final ConcurrentMap<Long, Instant> lastSendByUser = new ConcurrentHashMap<>();

    public MfaLoginApplicationService(
            final AuthApplicationService authService,
            final UserRepository users,
            final SecuritySettingsRepository settings,
            final TrustedDeviceTokens trustedDevices,
            final SmsService smsService,
            final PhoneLoginSettings phoneSettings,
            final Clock clock) {
        this.authService = authService;
        this.users = users;
        this.settings = settings;
        this.trustedDevices = trustedDevices;
        this.smsService = smsService;
        this.phoneSettings = phoneSettings;
        this.clock = clock;
    }

    public BeginResult beginPassword(
            final LoginCommand command, final ClientContext client, final @Nullable String trustedCookie) {
        final long userId =
                this.authService.authenticatePasswordLogin(command, client).id();
        return this.begin(userId, client, trustedCookie, null);
    }

    /** 外部身份回调已完成身份验证，待二次验证完成后才签发本地令牌。 */
    public BeginResult beginExternal(
            final ExternalLoginCandidate candidate, final ClientContext client, final @Nullable String trustedCookie) {
        return this.begin(candidate.userId(), client, trustedCookie, candidate);
    }

    private synchronized BeginResult begin(
            final long userId,
            final ClientContext client,
            final @Nullable String trustedCookie,
            final @Nullable ExternalLoginCandidate candidate) {
        final User user = this.users.findById(userId).orElseThrow(() -> new BizException(CommonErrors.UNAUTHORIZED));
        final SecuritySettings policy = this.settings.load();
        if (!policy.mfaEnabled()
                || user.getPhone() == null
                || user.getPhone().isBlank()
                || this.trustedDevices.verify(
                        trustedCookie, userId, user.getTokenVersion(), policy.revision(), policy.mfaRememberDays())) {
            return new BeginResult(
                    this.authService.completeLogin(
                            user,
                            client,
                            candidate == null ? null : candidate.providerId(),
                            candidate == null ? "登录成功" : candidate.successMessage()),
                    null,
                    null);
        }
        if (!this.smsService.isAvailable() || !this.phoneSettings.templateReady()) {
            throw new BizException(CommonErrors.SERVICE_UNAVAILABLE, "手机验证暂不可用，请联系管理员");
        }
        final Instant now = Instant.now(this.clock);
        this.challenges.entrySet().removeIf(entry -> !now.isBefore(entry.getValue().expiresAt));
        this.lastSendByUser
                .entrySet()
                .removeIf(entry -> !now.isBefore(entry.getValue().plus(MfaLoginApplicationService.SEND_INTERVAL)));
        if (this.challenges.size() >= MfaLoginApplicationService.MAX_CHALLENGES) {
            throw new BizException(CommonErrors.SERVICE_UNAVAILABLE, "验证服务繁忙，请稍后重试");
        }
        if (this.lastSendByUser.containsKey(userId)) {
            throw BizException.conflict("验证码请求过于频繁，请稍后重试");
        }
        final String pendingToken = this.randomToken();
        final String code = String.format(Locale.ROOT, "%06d", this.random.nextInt(1_000_000));
        final SmsSendResult sent = this.smsService.send(
                new SmsSendCommand(user.getPhone(), this.phoneSettings.templateCode(), Map.of("code", code)));
        if (sent != SmsSendResult.SENT && sent != SmsSendResult.LOGGED) {
            throw new BizException(CommonErrors.SERVICE_UNAVAILABLE, "验证码发送失败，请稍后重试");
        }
        if (sent == SmsSendResult.LOGGED && this.phoneSettings.isLocalMode()) {
            this.authService.recordLocalPhoneCodeSent(user, user.getPhone(), client, code);
        }
        this.lastSendByUser.put(userId, now);
        this.challenges.put(
                pendingToken,
                new Challenge(
                        userId,
                        user.getTokenVersion(),
                        user.getPhone(),
                        policy.revision(),
                        MfaLoginApplicationService.digest(pendingToken, code),
                        now.plus(MfaLoginApplicationService.CHALLENGE_TTL),
                        client,
                        candidate));
        return new BeginResult(null, pendingToken, MfaLoginApplicationService.mask(user.getPhone()));
    }

    public synchronized VerifiedResult verify(final @Nullable String pendingToken, final String code) {
        if (pendingToken == null) {
            throw BizException.badRequest("手机验证已过期，请重新登录");
        }
        final Challenge challenge = this.challenges.get(pendingToken);
        final Instant now = Instant.now(this.clock);
        if (challenge == null
                || !now.isBefore(challenge.expiresAt)
                || challenge.attempts >= MfaLoginApplicationService.MAX_ATTEMPTS) {
            this.challenges.remove(pendingToken);
            throw BizException.badRequest("手机验证已过期，请重新登录");
        }
        challenge.attempts++;
        if (!MessageDigest.isEqual(challenge.codeDigest, MfaLoginApplicationService.digest(pendingToken, code))) {
            if (challenge.attempts >= MfaLoginApplicationService.MAX_ATTEMPTS) {
                this.challenges.remove(pendingToken);
            }
            throw BizException.badRequest("验证码错误");
        }
        this.challenges.remove(pendingToken);
        final User user =
                this.users.findById(challenge.userId).orElseThrow(() -> new BizException(CommonErrors.UNAUTHORIZED));
        if (!user.isEnabled()
                || user.getTokenVersion() != challenge.tokenVersion
                || !challenge.phone.equals(user.getPhone())) {
            throw new BizException(CommonErrors.UNAUTHORIZED);
        }
        final SecuritySettings policy = this.settings.load();
        if (policy.revision() != challenge.settingsRevision) {
            throw BizException.badRequest("安全设置已变化，请重新登录");
        }
        final ExternalLoginCandidate candidate = challenge.candidate;
        final LoginResult login = this.authService.completeLogin(
                user,
                challenge.client,
                candidate == null ? null : candidate.providerId(),
                candidate == null ? "手机二次验证登录成功" : candidate.successMessage());
        final String trusted = policy.mfaEnabled() && policy.mfaRememberDays() > 0
                ? this.trustedDevices.issue(user.requireId(), user.getTokenVersion(), policy.revision())
                : null;
        return new VerifiedResult(login, trusted, policy.mfaRememberDays());
    }

    private String randomToken() {
        final byte[] value = new byte[32];
        this.random.nextBytes(value);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(value);
    }

    private static byte[] digest(final String token, final String code) {
        try {
            return MessageDigest.getInstance("SHA-256").digest((token + ":" + code).getBytes(StandardCharsets.UTF_8));
        } catch (final NoSuchAlgorithmException ex) {
            throw new IllegalStateException("JVM 缺少 SHA-256", ex);
        }
    }

    private static String mask(final String phone) {
        return phone.substring(0, 3) + "****" + phone.substring(phone.length() - 4);
    }

    public record BeginResult(
            @Nullable LoginResult login,
            @Nullable String pendingToken,
            @Nullable String maskedPhone) {}

    public record VerifiedResult(
            LoginResult login, @Nullable String trustedToken, int rememberDays) {}

    private static final class Challenge {

        private final long userId;
        private final int tokenVersion;
        private final String phone;
        private final long settingsRevision;
        private final byte[] codeDigest;
        private final Instant expiresAt;
        private final ClientContext client;
        private final @Nullable ExternalLoginCandidate candidate;
        private int attempts;

        private Challenge(
                final long userId,
                final int tokenVersion,
                final String phone,
                final long settingsRevision,
                final byte[] codeDigest,
                final Instant expiresAt,
                final ClientContext client,
                final @Nullable ExternalLoginCandidate candidate) {
            this.userId = userId;
            this.tokenVersion = tokenVersion;
            this.phone = phone;
            this.settingsRevision = settingsRevision;
            this.codeDigest = codeDigest;
            this.expiresAt = expiresAt;
            this.client = client;
            this.candidate = candidate;
        }
    }
}
