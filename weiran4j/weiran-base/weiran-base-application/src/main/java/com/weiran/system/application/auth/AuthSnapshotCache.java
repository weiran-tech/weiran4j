package com.weiran.system.application.auth;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.weiran.system.domain.auth.PrincipalSnapshot;
import java.time.Duration;
import java.util.Optional;
import java.util.function.Function;
import org.jspecify.annotations.Nullable;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * 按用户缓存身份与授权快照（30 秒），避免每个请求都查三张表。
 *
 * <p><b>只缓存权限，不缓存吊销状态</b>：令牌版本与账号状态由 {@link LocalIdentityResolver} 每次请求查库
 * （宪法 CP-8），所以这里的失效只影响「改权限多久生效」，不影响「吊销是否立即生效」。
 * 失效只作用于本进程，多实例下权限变更最多晚 30 秒生效（artifact.md#02 的剩余部分）。
 *
 * <p>失效时机：用户资料 / 状态 / 密码 / 角色变化时失效该用户；角色或菜单变化时全部失效。
 * 失效在事务提交后<b>再做一次</b>：只在提交前失效的话，并发请求可能在提交前把旧数据重新装回缓存，
 * 让变更晚 30 秒才生效。
 */
public class AuthSnapshotCache {

    /** 缓存有效期。 */
    public static final Duration TTL = Duration.ofSeconds(30);

    private final Cache<Long, PrincipalSnapshot> cache = Caffeine.newBuilder()
            .expireAfterWrite(AuthSnapshotCache.TTL)
            .maximumSize(10_000)
            .build();

    /** 读取快照，未命中时用 loader 加载（loader 返回 null 表示用户不存在，不缓存）。 */
    public Optional<PrincipalSnapshot> get(
            final long userId, final Function<Long, @Nullable PrincipalSnapshot> loader) {
        return Optional.ofNullable(this.cache.get(userId, loader));
    }

    /** 失效单个用户（立即 + 事务提交后）。 */
    public void evict(final long userId) {
        this.cache.invalidate(userId);
        AuthSnapshotCache.afterCommit(() -> this.cache.invalidate(userId));
    }

    /** 失效全部用户（立即 + 事务提交后）。 */
    public void evictAll() {
        this.cache.invalidateAll();
        AuthSnapshotCache.afterCommit(this.cache::invalidateAll);
    }

    private static void afterCommit(final Runnable action) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    action.run();
                }
            });
        }
    }
}
