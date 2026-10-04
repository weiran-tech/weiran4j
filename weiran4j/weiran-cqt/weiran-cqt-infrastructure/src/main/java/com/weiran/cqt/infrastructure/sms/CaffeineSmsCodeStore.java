package com.weiran.cqt.infrastructure.sms;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.weiran.cqt.domain.sms.SmsCode;
import com.weiran.cqt.domain.sms.SmsCodePolicy;
import com.weiran.cqt.domain.sms.SmsCodeStore;
import java.util.Optional;

/**
 * 进程内验证码存储（单实例部署）。是否过期由 {@link SmsCodePolicy} 按记录里的时间判断；
 * 缓存自身只按「写入后有效期 + 冷却期」淘汰，防止长期不用的手机号堆在内存里。多实例部署时要换成共享存储。
 */
public final class CaffeineSmsCodeStore implements SmsCodeStore {

    private static final long MAX_ENTRIES = 100_000;

    private final Cache<String, SmsCode> cache = Caffeine.newBuilder()
            .maximumSize(CaffeineSmsCodeStore.MAX_ENTRIES)
            .expireAfterWrite(SmsCodePolicy.CODE_TTL.plus(SmsCodePolicy.COOLDOWN))
            .build();

    @Override
    public Optional<SmsCode> get(final String phone) {
        return Optional.ofNullable(this.cache.getIfPresent(phone));
    }

    @Override
    public void put(final String phone, final SmsCode code) {
        this.cache.put(phone, code);
    }

    @Override
    public void remove(final String phone) {
        this.cache.invalidate(phone);
    }
}
