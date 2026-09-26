package com.weiran.system.application.auth;

import com.weiran.framework.auth.LoginUser;
import com.weiran.framework.auth.TokenAuthenticator;
import com.weiran.system.domain.auth.Authorization;
import com.weiran.system.domain.auth.TokenClaims;
import com.weiran.system.domain.auth.TokenCodec;
import com.weiran.system.domain.menu.MenuRepository;
import com.weiran.system.domain.user.User;
import com.weiran.system.domain.user.UserRepository;
import java.util.Optional;
import org.jspecify.annotations.Nullable;

/**
 * {@link TokenAuthenticator} 实现：校验 JWT → 比对令牌版本与用户状态 → 返回带角色与权限码的登录用户。
 *
 * <p>令牌版本不符（改过密码、被重置、被禁用）或用户已被删除、禁用时一律返回空，由拦截器输出 401。
 */
public class SystemTokenAuthenticator implements TokenAuthenticator {

    private final TokenCodec tokenCodec;

    private final UserRepository userRepository;

    private final MenuRepository menuRepository;

    private final AuthorizationResolver authorizationResolver;

    private final AuthSnapshotCache cache;

    /** 构造校验器。 */
    public SystemTokenAuthenticator(
            final TokenCodec tokenCodec,
            final UserRepository userRepository,
            final MenuRepository menuRepository,
            final AuthorizationResolver authorizationResolver,
            final AuthSnapshotCache cache) {
        this.tokenCodec = tokenCodec;
        this.userRepository = userRepository;
        this.menuRepository = menuRepository;
        this.authorizationResolver = authorizationResolver;
        this.cache = cache;
    }

    @Override
    public Optional<LoginUser> authenticate(final String bearerToken) {
        final Optional<TokenClaims> claims = this.tokenCodec.parse(bearerToken);
        if (claims.isEmpty()) {
            return Optional.empty();
        }
        final TokenClaims tokenClaims = claims.get();
        return this.cache
                .get(tokenClaims.userId(), this::load)
                .filter(snapshot -> snapshot.enabled() && snapshot.tokenVersion() == tokenClaims.version())
                .map(AuthSnapshotCache.Snapshot::loginUser);
    }

    private AuthSnapshotCache.@Nullable Snapshot load(final Long userId) {
        final Optional<User> found = this.userRepository.findById(userId);
        if (found.isEmpty()) {
            return null;
        }
        final User user = found.get();
        final Authorization authorization = this.authorizationResolver.resolve(userId);
        final LoginUser loginUser = new LoginUser(
                userId,
                user.getUsername(),
                user.getNickname(),
                authorization.roleCodes(),
                authorization.permissions(this.menuRepository.findAll()));
        return new AuthSnapshotCache.Snapshot(user.getTokenVersion(), user.isEnabled(), loginUser);
    }
}
