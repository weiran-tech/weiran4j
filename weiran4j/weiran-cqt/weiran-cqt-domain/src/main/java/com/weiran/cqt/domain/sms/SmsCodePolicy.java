package com.weiran.cqt.domain.sms;

import java.time.Duration;
import java.time.Instant;
import org.jspecify.annotations.Nullable;

/** 验证码规则：10 分钟有效、同号 60 秒冷却、校验成功即作废、输错 5 次作废。 */
public final class SmsCodePolicy {

    /** 有效期。 */
    public static final Duration CODE_TTL = Duration.ofMinutes(10);

    /** 同一手机号两次发送的最小间隔。 */
    public static final Duration COOLDOWN = Duration.ofSeconds(60);

    /** 同一验证码允许的最多失败次数，达到即作废。 */
    public static final int MAX_FAILED_ATTEMPTS = 5;

    private SmsCodePolicy() {}

    /** IP 发送上限的统计窗口。 */
    public static final Duration IP_WINDOW = Duration.ofHours(1);

    /**
     * 该 IP 是否已达到每小时发送上限。
     *
     * @param sentWithinHour 最近一小时已成功发送的条数
     * @param hourlyLimit 上限；0 或负数表示不限
     */
    public static boolean ipLimitReached(final int sentWithinHour, final int hourlyLimit) {
        return hourlyLimit > 0 && sentWithinHour >= hourlyLimit;
    }

    /** 生成一条新记录（覆盖旧码，旧码随之失效）。 */
    public static SmsCode issue(final String code, final Instant now) {
        return new SmsCode(code, now, now.plus(SmsCodePolicy.CODE_TTL), 0);
    }

    /** 距上次发送是否还在冷却期内。 */
    public static boolean inCooldown(final @Nullable SmsCode last, final Instant now) {
        return last != null && now.isBefore(last.sentAt().plus(SmsCodePolicy.COOLDOWN));
    }

    /**
     * 校验输入的验证码。
     *
     * @param stored 已存的验证码，没有则为 null
     * @param input 用户输入
     * @param now 当前时间
     * @return 校验结果与之后应保留的记录（null 表示删除）
     */
    public static Verification verify(final @Nullable SmsCode stored, final @Nullable String input, final Instant now) {
        if (stored == null || !now.isBefore(stored.expiresAt())) {
            return new Verification(false, null);
        }
        if (stored.code().equals(input == null ? null : input.strip())) {
            return new Verification(true, null);
        }
        final int failed = stored.failedAttempts() + 1;
        if (failed >= SmsCodePolicy.MAX_FAILED_ATTEMPTS) {
            return new Verification(false, null);
        }
        return new Verification(false, new SmsCode(stored.code(), stored.sentAt(), stored.expiresAt(), failed));
    }

    /**
     * 校验结果。
     *
     * @param matched 是否通过
     * @param remaining 之后应保留的记录；null 表示删除（通过、过期或失败次数用尽）
     */
    public record Verification(boolean matched, @Nullable SmsCode remaining) {}
}
