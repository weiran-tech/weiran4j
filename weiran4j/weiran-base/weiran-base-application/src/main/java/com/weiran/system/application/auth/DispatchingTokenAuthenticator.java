package com.weiran.system.application.auth;

import com.weiran.framework.auth.LoginUser;
import com.weiran.framework.auth.TokenAuthenticator;
import com.weiran.system.domain.auth.IdentityResolver;
import com.weiran.system.domain.auth.PermissionSource;
import com.weiran.system.domain.auth.PrincipalSnapshot;
import com.weiran.system.domain.auth.TokenIssuerReader;
import com.weiran.system.domain.auth.TokenVerifier;
import java.util.Collection;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import org.jspecify.annotations.Nullable;

/**
 * {@link TokenAuthenticator} 实现：认证拆成三段（D-014）——
 * 按 {@code iss} 选 {@link TokenVerifier} 验令牌 → {@link IdentityResolver} 认身份并判吊销 →
 * {@link PermissionSource} 定权限，最后组装成框架的 {@link LoginUser}。
 *
 * <p>按签发方分发而不是逐个校验器去试：逐个试会让一个不合法的令牌被每个校验器各验一遍，
 * 也会出现「两个签发方都认这张令牌」的歧义。任何一段失败都返回空，由拦截器统一输出 401。
 */
public class DispatchingTokenAuthenticator implements TokenAuthenticator {

    private final TokenIssuerReader issuerReader;

    private final Map<String, TokenVerifier> verifiers;

    private final IdentityResolver identityResolver;

    private final PermissionSource permissionSource;

    /**
     * 构造认证器。
     *
     * @throws IllegalStateException 两个不同的校验器声明了同一个签发方
     */
    public DispatchingTokenAuthenticator(
            final TokenIssuerReader issuerReader,
            final Collection<TokenVerifier> verifiers,
            final IdentityResolver identityResolver,
            final PermissionSource permissionSource) {
        this.issuerReader = issuerReader;
        this.verifiers = DispatchingTokenAuthenticator.index(verifiers);
        this.identityResolver = identityResolver;
        this.permissionSource = permissionSource;
    }

    @Override
    public Optional<LoginUser> authenticate(final String token) {
        return this.issuerReader
                .issuerOf(token)
                .map(this.verifiers::get)
                .flatMap(verifier -> verifier.verify(token))
                .flatMap(verified -> this.identityResolver
                        .resolve(verified)
                        .flatMap(userId -> this.permissionSource
                                .load(userId)
                                .map(snapshot -> toLoginUser(userId, snapshot, verified.idp()))));
    }

    private static LoginUser toLoginUser(
            final long userId, final PrincipalSnapshot snapshot, final @Nullable String idp) {
        return new LoginUser(
                userId, snapshot.username(), snapshot.nickname(), snapshot.roles(), snapshot.permissions(), idp);
    }

    private static Map<String, TokenVerifier> index(final Collection<TokenVerifier> verifiers) {
        final Map<String, TokenVerifier> byIssuer = new HashMap<>();
        for (final TokenVerifier verifier : verifiers) {
            final TokenVerifier previous = byIssuer.putIfAbsent(verifier.issuer(), verifier);
            if (previous != null && !previous.equals(verifier)) {
                throw new IllegalStateException("签发方 " + verifier.issuer() + " 注册了多个 TokenVerifier");
            }
        }
        return Map.copyOf(byIssuer);
    }
}
