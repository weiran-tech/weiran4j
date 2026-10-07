package com.weiran.system.application.auth;

import com.weiran.system.domain.auth.IdentityResolver;
import com.weiran.system.domain.auth.VerifiedToken;
import com.weiran.system.domain.user.UserRepository;
import java.util.Optional;

/**
 * 本地令牌的身份解析：{@code sub} 即用户 ID；每次请求按主键查令牌版本与账号状态判定吊销。
 *
 * <p>刻意不走 {@link AuthSnapshotCache}：缓存只在本进程内失效，多实例下另一个节点改密 / 禁用后，
 * 本节点会继续放行最长一个缓存周期（宪法 CP-8、artifact.md#02）。多一次主键查询换「吊销在所有实例立即生效」。
 */
public class LocalIdentityResolver implements IdentityResolver {

    private final UserRepository userRepository;

    /** 构造解析器。 */
    public LocalIdentityResolver(final UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public Optional<Long> resolve(final VerifiedToken token) {
        final Integer version = token.version();
        if (version == null) {
            return Optional.empty();
        }
        final long userId;
        try {
            userId = Long.parseLong(token.subject());
        } catch (final NumberFormatException ex) {
            return Optional.empty();
        }
        return this.userRepository
                .findAuthState(userId)
                .filter(state -> state.enabled() && state.tokenVersion() == version)
                .map(state -> userId);
    }
}
