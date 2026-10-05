package com.weiran.system.application.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.weiran.system.domain.auth.AuthState;
import com.weiran.system.domain.auth.VerifiedToken;
import com.weiran.system.domain.user.UserRepository;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class LocalIdentityResolverTest {

    @Test
    @DisplayName("用户启用且令牌版本一致时解析出用户 ID；每次都查库")
    void resolvesWhenVersionMatches() {
        final UserRepository users = mock(UserRepository.class);
        when(users.findAuthState(7L)).thenReturn(Optional.of(new AuthState(3, true)));
        final LocalIdentityResolver resolver = new LocalIdentityResolver(users);

        assertThat(resolver.resolve(new VerifiedToken("weiran4j", "7", 3))).contains(7L);

        // 库里的版本变了（另一个实例改了密码）：下一次就不再放行，没有任何缓存挡在中间。
        when(users.findAuthState(7L)).thenReturn(Optional.of(new AuthState(4, true)));
        assertThat(resolver.resolve(new VerifiedToken("weiran4j", "7", 3))).isEmpty();
    }

    @Test
    @DisplayName("账号禁用、用户不存在、主体不是数字或没有令牌版本时返回空")
    void rejectsRevokedOrMalformed() {
        final UserRepository users = mock(UserRepository.class);
        when(users.findAuthState(7L)).thenReturn(Optional.of(new AuthState(3, false)));
        when(users.findAuthState(8L)).thenReturn(Optional.empty());
        final LocalIdentityResolver resolver = new LocalIdentityResolver(users);

        assertThat(resolver.resolve(new VerifiedToken("weiran4j", "7", 3))).isEmpty();
        assertThat(resolver.resolve(new VerifiedToken("weiran4j", "8", 0))).isEmpty();
        assertThat(resolver.resolve(new VerifiedToken("weiran4j", "abc", 0))).isEmpty();
        assertThat(resolver.resolve(new VerifiedToken("weiran4j", "7", null))).isEmpty();
    }
}
