package com.weiran.cqt.infrastructure.sms;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.weiran.cqt.domain.sms.SmsCodePolicy;
import com.weiran.cqt.domain.sms.SmsIpCounter;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;

/**
 * 进程内 IP 发送计数（单实例部署）：每个 IP 保留最近一小时内成功发送的时刻，按滑动窗口计数。
 * 调用方（短信应用服务）已串行化，这里的队列不再加锁。
 */
public final class CaffeineSmsIpCounter implements SmsIpCounter {

    private static final long MAX_ENTRIES = 100_000;

    private final Cache<String, Deque<Instant>> cache = Caffeine.newBuilder()
            .maximumSize(CaffeineSmsIpCounter.MAX_ENTRIES)
            .expireAfterAccess(SmsCodePolicy.IP_WINDOW)
            .build();

    private final Clock clock;

    /** 构造计数器。 */
    public CaffeineSmsIpCounter(final Clock clock) {
        this.clock = clock;
    }

    @Override
    public int sentWithinHour(final String ip) {
        final Deque<Instant> sent = this.cache.getIfPresent(ip);
        if (sent == null) {
            return 0;
        }
        this.evictExpired(sent);
        return sent.size();
    }

    @Override
    public void recordSent(final String ip) {
        final Deque<Instant> sent = this.cache.get(ip, key -> new ArrayDeque<>());
        this.evictExpired(sent);
        sent.addLast(this.clock.instant());
    }

    private void evictExpired(final Deque<Instant> sent) {
        final Instant windowStart = this.clock.instant().minus(SmsCodePolicy.IP_WINDOW);
        while (!sent.isEmpty() && !sent.peekFirst().isAfter(windowStart)) {
            sent.pollFirst();
        }
    }
}
