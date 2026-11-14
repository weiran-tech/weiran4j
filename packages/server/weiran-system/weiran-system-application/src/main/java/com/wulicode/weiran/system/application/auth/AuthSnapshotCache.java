package com.wulicode.weiran.system.application.auth;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.wulicode.weiran.system.domain.auth.AuthorizationRevision;
import com.wulicode.weiran.system.domain.auth.PrincipalSnapshot;
import java.time.Duration;
import java.util.Optional;
import java.util.function.Function;
import org.jspecify.annotations.Nullable;

/** 修订号隔离的本地权限缓存；每次鉴权先读取共享修订号，吊销状态仍逐请求查库。 */
public class AuthSnapshotCache {
    /** 回收不再使用的版本，时限不作为权限生效边界。 */
    public static final Duration TTL = Duration.ofSeconds(30);

    private record Key(long userId, long revision) {}

    private final AuthorizationRevision revision;
    private final Cache<Key, PrincipalSnapshot> cache = Caffeine.newBuilder()
            .expireAfterWrite(AuthSnapshotCache.TTL)
            .maximumSize(10_000)
            .build();
    /** 使用共享修订号端口。 */
    public AuthSnapshotCache(final AuthorizationRevision revision) {
        this.revision = revision;
    }
    /** 读取当前事务视图的修订号。 */
    public long revision() {
        return this.revision.current();
    }
    /** 调用方须用同一只读事务读取修订号和装载快照。 */
    public Optional<PrincipalSnapshot> get(
            final long userId, final Function<Long, @Nullable PrincipalSnapshot> loader) {
        final Function<Key, @Nullable PrincipalSnapshot> mapping = key -> loader.apply(key.userId());
        return Optional.ofNullable(this.cache.get(new Key(userId, this.revision()), mapping));
    }
    /** 在当前业务写事务中发布变更；全局修订号也使其它实例失效。 */
    public void evict(final long userId) {
        this.revision.advance();
    }
    /** 在当前业务写事务中发布授权变更。 */
    public void evictAll() {
        this.revision.advance();
    }
}
