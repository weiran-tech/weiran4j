package com.weiran.system.application.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.weiran.common.error.BizException;
import com.weiran.common.error.CommonErrors;
import com.weiran.common.status.EnableStatus;
import com.weiran.system.api.auth.BindIdentityCommand;
import com.weiran.system.api.auth.ClientContext;
import com.weiran.system.api.auth.LoginResult;
import com.weiran.system.api.auth.SsoRedirect;
import com.weiran.system.domain.identity.ExternalIdentity;
import com.weiran.system.domain.identity.ExternalIdentityProvider;
import com.weiran.system.domain.identity.ExternalIdentityProviders;
import com.weiran.system.domain.identity.SsoMode;
import com.weiran.system.domain.identity.SsoState;
import com.weiran.system.domain.identity.SsoStateSigner;
import com.weiran.system.domain.identity.UserIdentity;
import com.weiran.system.domain.identity.UserIdentityRepository;
import com.weiran.system.domain.user.Gender;
import com.weiran.system.domain.user.User;
import com.weiran.system.domain.user.UserRepository;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;

class ExternalLoginApplicationServiceTest {

    private static final ClientContext CLIENT = new ClientContext("127.0.0.1", "JUnit");

    private static final Instant NOW = Instant.parse("2026-10-06T00:00:00Z");

    private final ExternalIdentityProviders providers = mock(ExternalIdentityProviders.class);

    private final ExternalIdentityProvider provider = mock(ExternalIdentityProvider.class);

    private final SsoStateSigner signer = mock(SsoStateSigner.class);

    private final UserIdentityRepository identities = mock(UserIdentityRepository.class);

    private final UserRepository users = mock(UserRepository.class);

    private final IdentityProvisioner provisioner = mock(IdentityProvisioner.class);

    private final AuthApplicationService auth = mock(AuthApplicationService.class);

    private ExternalLoginApplicationService service;

    @SuppressWarnings("unchecked")
    @BeforeEach
    void setUp() {
        when(this.providers.find("kc")).thenReturn(Optional.of(this.provider));
        when(this.providers.publicBaseUrl()).thenReturn("https://admin.example.com");
        when(this.provider.id()).thenReturn("kc");
        when(this.provider.type()).thenReturn("oidc");
        when(this.provider.name()).thenReturn("统一身份");
        when(this.provider.authorizeUrl(any(), anyString())).thenReturn("https://idp/auth");
        this.service = new ExternalLoginApplicationService(
                this.providers,
                this.signer,
                this.identities,
                this.users,
                this.provisioner,
                this.auth,
                mock(ObjectProvider.class),
                Clock.fixed(NOW, ZoneOffset.UTC));
    }

    private static User user(final long id, final String passwordHash, final EnableStatus status) {
        return User.builder()
                .id(id)
                .username("u" + id)
                .nickname("用户" + id)
                .passwordHash(passwordHash)
                .gender(Gender.UNKNOWN)
                .status(status)
                .tokenVersion(0)
                .build();
    }

    private SsoRedirect callback(final SsoMode mode, final ExternalIdentity identity) {
        final SsoState state = new SsoState(
                "kc", "st", "n", "v", "/target", mode, mode == SsoMode.BIND ? 7L : null, NOW.plusSeconds(600));
        when(this.signer.verify("cookie", NOW)).thenReturn(Optional.of(state));
        when(this.provider.complete(any(), eq(state), eq("https://admin.example.com/api/auth/sso/kc/callback")))
                .thenReturn(Optional.of(identity));
        return this.service.callback("kc", Map.of("state", "st", "code", "c"), "cookie", CLIENT);
    }

    private static ExternalIdentity identity(final String sub) {
        return new ExternalIdentity("kc", sub, "zhangsan", "张三", null);
    }

    @Test
    @DisplayName("authorize：生成并签名流程状态，回跳路径被规范化；bind 模式未登录直接回登录页")
    void authorizeBuildsState() {
        when(this.signer.sign(any())).thenReturn("signed");
        final SsoRedirect result = this.service.authorize("kc", "https://evil.com", "login", null);
        assertThat(result.location()).isEqualTo("https://idp/auth");
        assertThat(result.flowCookie()).isEqualTo("signed");
        verify(this.provider)
                .authorizeUrl(
                        org.mockito.ArgumentMatchers.argThat(
                                s -> s.redirect().equals("/") && s.mode() == SsoMode.LOGIN),
                        eq("https://admin.example.com/api/auth/sso/kc/callback"));

        assertThat(this.service.authorize("kc", "/profile", "bind", null).location())
                .isEqualTo("/login?ssoError=40100");
        assertThat(this.service.authorize("nope", "/", "login", null).location())
                .isEqualTo("/login?ssoError=40102");
    }

    @Test
    @DisplayName("callback：流程 Cookie 无效或 state 不符时 40102，并写失败日志")
    void callbackRejectsBadState() {
        assertThat(this.service
                        .callback("kc", Map.of("state", "st"), null, CLIENT)
                        .location())
                .isEqualTo("/login?ssoError=40102");
        when(this.signer.verify("cookie", NOW))
                .thenReturn(
                        Optional.of(new SsoState("kc", "st", "n", "v", "/", SsoMode.LOGIN, null, NOW.plusSeconds(60))));
        assertThat(this.service
                        .callback("kc", Map.of("state", "other"), "cookie", CLIENT)
                        .location())
                .isEqualTo("/login?ssoError=40102");
        verify(this.auth, org.mockito.Mockito.times(2))
                .recordExternalFailure(any(), anyString(), eq(CLIENT), anyString());
    }

    @Test
    @DisplayName("已绑定：登录成功，回到 redirect，令牌带 idp")
    void loginsBoundIdentity() {
        when(this.identities.findByProviderAndExternalId("kc", "sub-1"))
                .thenReturn(Optional.of(new UserIdentity(1L, 7L, "kc", "sub-1", null, null, null)));
        final User user = ExternalLoginApplicationServiceTest.user(7L, "hash", EnableStatus.ENABLED);
        when(this.users.findById(7L)).thenReturn(Optional.of(user));
        final LoginResult login = new LoginResult("jwt", "Bearer", 60, 7L);
        when(this.auth.completeLogin(eq(user), eq(CLIENT), eq("kc"), anyString()))
                .thenReturn(login);

        final SsoRedirect result = this.callback(SsoMode.LOGIN, ExternalLoginApplicationServiceTest.identity("sub-1"));

        assertThat(result.location()).isEqualTo("/target");
        assertThat(result.login()).isEqualTo(login);
    }

    @Test
    @DisplayName("未绑定且未开启自动开通：40303；本地同名用户存在时即使开了自动开通也不关联")
    void refusesUnprovisioned() {
        when(this.identities.findByProviderAndExternalId("kc", "sub-1")).thenReturn(Optional.empty());
        when(this.provider.autoProvision()).thenReturn(false);
        assertThat(this.callback(SsoMode.LOGIN, ExternalLoginApplicationServiceTest.identity("sub-1"))
                        .location())
                .isEqualTo("/login?ssoError=40303");

        when(this.provider.autoProvision()).thenReturn(true);
        when(this.users.existsByUsername("zhangsan")).thenReturn(true);
        assertThat(this.callback(SsoMode.LOGIN, ExternalLoginApplicationServiceTest.identity("sub-1"))
                        .location())
                .isEqualTo("/login?ssoError=40303");
        verify(this.provisioner, never()).provision(any(), any(), anyString());
    }

    @Test
    @DisplayName("开启自动开通：用规范化的用户名开通后登录")
    void provisionsNewUser() {
        when(this.identities.findByProviderAndExternalId("kc", "sub-1")).thenReturn(Optional.empty());
        when(this.provider.autoProvision()).thenReturn(true);
        when(this.users.existsByUsername("zhangsan")).thenReturn(false);
        when(this.provisioner.provision(eq(this.provider), any(), eq("zhangsan")))
                .thenReturn(9L);
        final User created = ExternalLoginApplicationServiceTest.user(9L, "", EnableStatus.ENABLED);
        when(this.users.findById(9L)).thenReturn(Optional.of(created));
        when(this.auth.completeLogin(eq(created), eq(CLIENT), eq("kc"), anyString()))
                .thenReturn(new LoginResult("jwt", "Bearer", 60, 9L));

        assertThat(this.callback(SsoMode.LOGIN, ExternalLoginApplicationServiceTest.identity("sub-1"))
                        .login())
                .isNotNull();
    }

    @Test
    @DisplayName("绑定到被禁用的用户：40301")
    void refusesDisabledUser() {
        when(this.identities.findByProviderAndExternalId("kc", "sub-1"))
                .thenReturn(Optional.of(new UserIdentity(1L, 7L, "kc", "sub-1", null, null, null)));
        when(this.users.findById(7L))
                .thenReturn(Optional.of(ExternalLoginApplicationServiceTest.user(7L, "hash", EnableStatus.DISABLED)));
        assertThat(this.callback(SsoMode.LOGIN, ExternalLoginApplicationServiceTest.identity("sub-1"))
                        .location())
                .isEqualTo("/login?ssoError=40301");
    }

    @Test
    @DisplayName("bind 模式：已绑定给别人 40901（回个人中心）；成功则回 /profile?bound=kc")
    void bindsToCurrentUser() {
        when(this.identities.findByProviderAndExternalId("kc", "sub-1"))
                .thenReturn(Optional.of(new UserIdentity(1L, 8L, "kc", "sub-1", null, null, null)));
        assertThat(this.callback(SsoMode.BIND, ExternalLoginApplicationServiceTest.identity("sub-1"))
                        .location())
                .isEqualTo("/profile?ssoError=40901");

        when(this.identities.findByProviderAndExternalId("kc", "sub-2")).thenReturn(Optional.empty());
        when(this.users.findById(7L))
                .thenReturn(Optional.of(ExternalLoginApplicationServiceTest.user(7L, "hash", EnableStatus.ENABLED)));
        assertThat(this.callback(SsoMode.BIND, ExternalLoginApplicationServiceTest.identity("sub-2"))
                        .location())
                .isEqualTo("/profile?bound=kc");
        verify(this.identities)
                .insert(org.mockito.ArgumentMatchers.argThat(
                        i -> i.userId() == 7L && i.externalId().equals("sub-2")));
    }

    @Test
    @DisplayName("本人解绑：没有本地密码且只剩一个时拒绝；不属于本人时 40400")
    void unbindOwnGuardsLockout() {
        final UserIdentity only = new UserIdentity(1L, 7L, "kc", "sub-1", null, null, null);
        when(this.identities.findById(1L)).thenReturn(Optional.of(only));
        when(this.identities.findByUserId(7L)).thenReturn(List.of(only));
        when(this.users.findById(7L))
                .thenReturn(Optional.of(ExternalLoginApplicationServiceTest.user(7L, "", EnableStatus.ENABLED)));
        assertThatThrownBy(() -> this.service.unbindOwn(7L, 1L))
                .isInstanceOfSatisfying(
                        BizException.class, ex -> assertThat(ex.getErrorCode()).isEqualTo(CommonErrors.CONFLICT));
        verify(this.identities, never()).deleteById(1L);

        assertThatThrownBy(() -> this.service.unbindOwn(8L, 1L))
                .isInstanceOfSatisfying(
                        BizException.class, ex -> assertThat(ex.getErrorCode()).isEqualTo(CommonErrors.NOT_FOUND));

        when(this.users.findById(7L))
                .thenReturn(Optional.of(ExternalLoginApplicationServiceTest.user(7L, "hash", EnableStatus.ENABLED)));
        this.service.unbindOwn(7L, 1L);
        verify(this.identities).deleteById(1L);
    }

    @Test
    @DisplayName("管理员绑定：提供方未配置 40000；外部身份已被绑定 40901")
    void adminBindValidates() {
        when(this.users.findById(7L))
                .thenReturn(Optional.of(ExternalLoginApplicationServiceTest.user(7L, "hash", EnableStatus.ENABLED)));
        assertThatThrownBy(() -> this.service.bind(7L, new BindIdentityCommand("nope", "x", null)))
                .isInstanceOfSatisfying(
                        BizException.class, ex -> assertThat(ex.getErrorCode()).isEqualTo(CommonErrors.BAD_REQUEST));
        when(this.identities.findByProviderAndExternalId("kc", "sub-1"))
                .thenReturn(Optional.of(new UserIdentity(1L, 8L, "kc", "sub-1", null, null, null)));
        assertThatThrownBy(() -> this.service.bind(7L, new BindIdentityCommand("kc", "sub-1", null)))
                .isInstanceOfSatisfying(
                        BizException.class, ex -> assertThat(ex.getErrorCode()).isEqualTo(CommonErrors.CONFLICT));
        when(this.identities.findByProviderAndExternalId("kc", "sub-2")).thenReturn(Optional.empty());
        when(this.identities.insert(any())).thenReturn(5L);
        assertThat(this.service.bind(7L, new BindIdentityCommand(" kc ", " sub-2 ", "张三")))
                .isEqualTo(5L);
    }
}
