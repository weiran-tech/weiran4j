package com.weiran.system.application.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.weiran.framework.auth.LoginUser;
import com.weiran.system.domain.auth.PrincipalSnapshot;
import com.weiran.system.domain.auth.TokenVerifier;
import com.weiran.system.domain.auth.VerifiedToken;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class DispatchingTokenAuthenticatorTest {

    /** 令牌格式 {@code <iss>:<sub>}：只为测试分发，不涉及签名。 */
    private static Optional<String> issuerOf(final String token) {
        final int colon = token.indexOf(':');
        return colon < 0 ? Optional.empty() : Optional.of(token.substring(0, colon));
    }

    private static TokenVerifier verifier(final String issuer) {
        return new TokenVerifier() {
            @Override
            public String issuer() {
                return issuer;
            }

            @Override
            public Optional<VerifiedToken> verify(final String token) {
                return token.startsWith(issuer + ":")
                        ? Optional.of(new VerifiedToken(issuer, token.substring(issuer.length() + 1), 0))
                        : Optional.empty();
            }
        };
    }

    private static DispatchingTokenAuthenticator authenticator(final List<TokenVerifier> verifiers) {
        return new DispatchingTokenAuthenticator(
                DispatchingTokenAuthenticatorTest::issuerOf,
                verifiers,
                token -> "9".equals(token.subject()) ? Optional.of(9L) : Optional.empty(),
                userId -> Optional.of(
                        new PrincipalSnapshot("zhangsan", "张三", Set.of("editor"), Set.of("system:user:list"))));
    }

    @Test
    @DisplayName("按 iss 选校验器，三段都通过时组装出 LoginUser")
    void dispatchesByIssuer() {
        final DispatchingTokenAuthenticator authenticator = DispatchingTokenAuthenticatorTest.authenticator(List.of(
                DispatchingTokenAuthenticatorTest.verifier("weiran4j"),
                DispatchingTokenAuthenticatorTest.verifier("idp")));

        assertThat(authenticator.authenticate("idp:9"))
                .contains(new LoginUser(9L, "zhangsan", "张三", Set.of("editor"), Set.of("system:user:list")));
        assertThat(authenticator.authenticate("weiran4j:9")).isPresent();
    }

    @Test
    @DisplayName("读不出 iss、iss 没有对应校验器、身份解析失败时都返回空")
    void rejectsUnknownIssuerAndUnresolvedIdentity() {
        final DispatchingTokenAuthenticator authenticator = DispatchingTokenAuthenticatorTest.authenticator(
                List.of(DispatchingTokenAuthenticatorTest.verifier("weiran4j")));

        assertThat(authenticator.authenticate("no-issuer")).isEmpty();
        assertThat(authenticator.authenticate("other:9")).isEmpty();
        assertThat(authenticator.authenticate("weiran4j:8")).isEmpty();
    }

    @Test
    @DisplayName("两个不同的校验器声明同一个签发方时构造失败；同一实例重复出现不算冲突")
    void rejectsDuplicateIssuer() {
        final TokenVerifier local = DispatchingTokenAuthenticatorTest.verifier("weiran4j");
        assertThatThrownBy(() -> DispatchingTokenAuthenticatorTest.authenticator(
                        List.of(local, DispatchingTokenAuthenticatorTest.verifier("weiran4j"))))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("weiran4j");
        assertThat(DispatchingTokenAuthenticatorTest.authenticator(List.of(local, local))
                        .authenticate("weiran4j:9"))
                .isPresent();
    }
}
