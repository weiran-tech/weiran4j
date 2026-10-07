package com.weiran.system.application.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.weiran.framework.error.BizException;
import com.weiran.framework.error.CommonErrors;
import com.weiran.framework.status.EnableStatus;
import com.weiran.system.api.auth.AuthenticatedUser;
import com.weiran.system.api.auth.ChangePasswordCommand;
import com.weiran.system.api.auth.ClientContext;
import com.weiran.system.api.auth.LoginCommand;
import com.weiran.system.api.auth.LoginResult;
import com.weiran.system.domain.auth.Authorization;
import com.weiran.system.domain.auth.TokenClaims;
import com.weiran.system.domain.auth.TokenCodec;
import com.weiran.system.domain.department.DepartmentRepository;
import com.weiran.system.domain.identity.ExternalIdentityProvider;
import com.weiran.system.domain.identity.ExternalIdentityProviders;
import com.weiran.system.domain.loginlog.LoginLog;
import com.weiran.system.domain.loginlog.LoginLogRepository;
import com.weiran.system.domain.menu.MenuRepository;
import com.weiran.system.domain.role.Role;
import com.weiran.system.domain.user.Gender;
import com.weiran.system.domain.user.PasswordHasher;
import com.weiran.system.domain.user.User;
import com.weiran.system.domain.user.UserRepository;
import java.time.Clock;
import java.time.Duration;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class AuthApplicationServiceTest {

    private static final ClientContext CLIENT = new ClientContext("127.0.0.1", "JUnit");

    private UserRepository users;

    private LoginLogRepository loginLogs;

    private PasswordHasher hasher;

    private TokenCodec tokenCodec;

    private AuthorizationResolver authorizationResolver;

    private ExternalIdentityProviders providers;

    private AuthApplicationService service;

    private static User user(final EnableStatus status) {
        return User.builder()
                .id(7L)
                .username("zhangsan")
                .nickname("张三")
                .passwordHash("hash")
                .gender(Gender.UNKNOWN)
                .status(status)
                .tokenVersion(2)
                .build();
    }

    @BeforeEach
    void setUp() {
        this.users = mock(UserRepository.class);
        this.loginLogs = mock(LoginLogRepository.class);
        this.hasher = mock(PasswordHasher.class);
        this.tokenCodec = mock(TokenCodec.class);
        this.authorizationResolver = mock(AuthorizationResolver.class);
        this.providers = mock(ExternalIdentityProviders.class);
        when(this.providers.passwordLoginEnabled()).thenReturn(true);
        when(this.providers.publicBaseUrl()).thenReturn("https://admin.example.com");
        this.service = new AuthApplicationService(
                this.users,
                mock(MenuRepository.class),
                mock(DepartmentRepository.class),
                this.loginLogs,
                this.hasher,
                this.tokenCodec,
                this.authorizationResolver,
                new AuthSnapshotCache(),
                Clock.systemUTC(),
                this.providers);
    }

    private String loggedStatus() {
        final ArgumentCaptor<LoginLog> captor = ArgumentCaptor.forClass(LoginLog.class);
        verify(this.loginLogs).append(captor.capture());
        return captor.getValue().status();
    }

    @Test
    @DisplayName("authenticate 成功：返回用户，不签发令牌、不写成功日志、不记录登录信息")
    void authenticateSucceedsWithoutSideEffects() {
        when(this.users.findByUsername("zhangsan"))
                .thenReturn(Optional.of(AuthApplicationServiceTest.user(EnableStatus.ENABLED)));
        when(this.hasher.matches("pwd", "hash")).thenReturn(true);

        final AuthenticatedUser result =
                this.service.authenticate(" zhangsan ", "pwd", AuthApplicationServiceTest.CLIENT);

        assertThat(result).isEqualTo(new AuthenticatedUser(7L, "zhangsan"));
        verify(this.tokenCodec, never()).issue(any());
        verify(this.loginLogs, never()).append(any());
        verify(this.users, never()).recordLogin(eq(7L), anyString(), any());
    }

    @Test
    @DisplayName("authenticate：用户名不存在与密码错误都抛 40101，且都跑一次 BCrypt、都写失败日志")
    void authenticateRejectsBadCredentialsIndistinguishably() {
        when(this.users.findByUsername("ghost")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> this.service.authenticate("ghost", "pwd", AuthApplicationServiceTest.CLIENT))
                .isInstanceOfSatisfying(
                        BizException.class,
                        ex -> assertThat(ex.getErrorCode()).isEqualTo(CommonErrors.BAD_CREDENTIALS));
        verify(this.hasher, times(1)).matches(eq("pwd"), anyString());
        assertThat(this.loggedStatus()).isEqualTo(LoginLog.STATUS_FAIL);
        verify(this.tokenCodec, never()).issue(any());
    }

    @Test
    @DisplayName("authenticate：密码错误抛 40101 并写失败日志")
    void authenticateRejectsWrongPassword() {
        when(this.users.findByUsername("zhangsan"))
                .thenReturn(Optional.of(AuthApplicationServiceTest.user(EnableStatus.ENABLED)));
        when(this.hasher.matches("bad", "hash")).thenReturn(false);
        assertThatThrownBy(() -> this.service.authenticate("zhangsan", "bad", AuthApplicationServiceTest.CLIENT))
                .isInstanceOfSatisfying(
                        BizException.class,
                        ex -> assertThat(ex.getErrorCode()).isEqualTo(CommonErrors.BAD_CREDENTIALS));
        assertThat(this.loggedStatus()).isEqualTo(LoginLog.STATUS_FAIL);
    }

    @Test
    @DisplayName("authenticate：账号禁用抛 40301 并写失败日志")
    void authenticateRejectsDisabledAccount() {
        when(this.users.findByUsername("zhangsan"))
                .thenReturn(Optional.of(AuthApplicationServiceTest.user(EnableStatus.DISABLED)));
        when(this.hasher.matches("pwd", "hash")).thenReturn(true);
        assertThatThrownBy(() -> this.service.authenticate("zhangsan", "pwd", AuthApplicationServiceTest.CLIENT))
                .isInstanceOfSatisfying(
                        BizException.class,
                        ex -> assertThat(ex.getErrorCode()).isEqualTo(CommonErrors.ACCOUNT_DISABLED));
        assertThat(this.loggedStatus()).isEqualTo(LoginLog.STATUS_FAIL);
    }

    @Test
    @DisplayName("login 复用 authenticate：成功后签发令牌、写一条成功日志、返回用户 ID")
    void loginReusesAuthenticate() {
        final User user = AuthApplicationServiceTest.user(EnableStatus.ENABLED);
        when(this.users.findByUsername("zhangsan")).thenReturn(Optional.of(user));
        when(this.users.findById(7L)).thenReturn(Optional.of(user));
        when(this.hasher.matches("pwd", "hash")).thenReturn(true);
        when(this.tokenCodec.issue(new TokenClaims(7L, "zhangsan", 2))).thenReturn("jwt");
        when(this.tokenCodec.ttl()).thenReturn(Duration.ofHours(1));

        final LoginResult result =
                this.service.login(new LoginCommand("zhangsan", "pwd"), AuthApplicationServiceTest.CLIENT);

        assertThat(result).isEqualTo(new LoginResult("jwt", "Bearer", 3600, 7L));
        assertThat(this.loggedStatus()).isEqualTo(LoginLog.STATUS_SUCCESS);
    }

    private static User passwordless() {
        return AuthApplicationServiceTest.user(EnableStatus.ENABLED).toBuilder()
                .passwordHash("")
                .build();
    }

    @Test
    @DisplayName("没有本地密码的用户：authenticate 返回 40101，仍对 DUMMY_HASH 跑一次 BCrypt，不拿空哈希去比")
    void passwordlessUserCannotUsePassword() {
        when(this.users.findByUsername("zhangsan")).thenReturn(Optional.of(AuthApplicationServiceTest.passwordless()));
        when(this.hasher.matches(eq("pwd"), anyString())).thenReturn(true);

        assertThatThrownBy(() -> this.service.authenticate("zhangsan", "pwd", AuthApplicationServiceTest.CLIENT))
                .isInstanceOfSatisfying(
                        BizException.class,
                        ex -> assertThat(ex.getErrorCode()).isEqualTo(CommonErrors.BAD_CREDENTIALS));
        verify(this.hasher, never()).matches("pwd", "");
        verify(this.hasher, times(1)).matches(eq("pwd"), anyString());
    }

    @Test
    @DisplayName("没有本地密码的用户：verify-password 40101，修改密码 40000")
    void passwordlessUserPasswordOperations() {
        when(this.users.findById(7L)).thenReturn(Optional.of(AuthApplicationServiceTest.passwordless()));

        assertThatThrownBy(() -> this.service.verifyPassword(7L, "x"))
                .isInstanceOfSatisfying(
                        BizException.class,
                        ex -> assertThat(ex.getErrorCode()).isEqualTo(CommonErrors.BAD_CREDENTIALS));
        assertThatThrownBy(() -> this.service.changePassword(7L, new ChangePasswordCommand("x", "Passw0rd1")))
                .isInstanceOfSatisfying(
                        BizException.class, ex -> assertThat(ex.getErrorCode()).isEqualTo(CommonErrors.BAD_REQUEST));
    }

    @Test
    @DisplayName("密码登录关闭：普通用户在校验密码之前就得到 40304，并写失败日志")
    void passwordLoginDisabledRejectsRegularUser() {
        when(this.providers.passwordLoginEnabled()).thenReturn(false);
        when(this.users.findByUsername("zhangsan"))
                .thenReturn(Optional.of(AuthApplicationServiceTest.user(EnableStatus.ENABLED)));

        assertThatThrownBy(() ->
                        this.service.login(new LoginCommand("zhangsan", "pwd"), AuthApplicationServiceTest.CLIENT))
                .isInstanceOfSatisfying(
                        BizException.class,
                        ex -> assertThat(ex.getErrorCode()).isEqualTo(CommonErrors.PASSWORD_LOGIN_DISABLED));
        verify(this.hasher, never()).matches(anyString(), anyString());
        assertThat(this.loggedStatus()).isEqualTo(LoginLog.STATUS_FAIL);
    }

    @Test
    @DisplayName("密码登录关闭：内置超管仍可用密码登录（应急入口）")
    void passwordLoginDisabledAllowsBuiltinSuperAdmin() {
        when(this.providers.passwordLoginEnabled()).thenReturn(false);
        final User admin = AuthApplicationServiceTest.user(EnableStatus.ENABLED).toBuilder()
                .builtin(true)
                .build();
        when(this.users.findByUsername("zhangsan")).thenReturn(Optional.of(admin));
        when(this.users.findById(7L)).thenReturn(Optional.of(admin));
        when(this.authorizationResolver.resolve(7L))
                .thenReturn(Authorization.of(List.of(AuthApplicationServiceTest.superAdminRole()), Set.of()));
        when(this.hasher.matches("pwd", "hash")).thenReturn(true);
        when(this.tokenCodec.issue(any())).thenReturn("jwt");
        when(this.tokenCodec.ttl()).thenReturn(Duration.ofHours(1));

        assertThat(this.service
                        .login(new LoginCommand("zhangsan", "pwd"), AuthApplicationServiceTest.CLIENT)
                        .accessToken())
                .isEqualTo("jwt");
    }

    @Test
    @DisplayName("登出：外部登录的会话返回提供方登出地址（回跳 /login），密码登录的会话为 null")
    void logoutReturnsProviderLogoutUrl() {
        final ExternalIdentityProvider provider = mock(ExternalIdentityProvider.class);
        when(provider.logoutUrl("https://admin.example.com/login")).thenReturn(Optional.of("https://idp/logout"));
        when(this.providers.find("kc")).thenReturn(Optional.of(provider));

        assertThat(this.service
                        .logout(7L, AuthApplicationServiceTest.CLIENT, "kc")
                        .ssoLogoutUrl())
                .isEqualTo("https://idp/logout");
        assertThat(this.service
                        .logout(7L, AuthApplicationServiceTest.CLIENT, null)
                        .ssoLogoutUrl())
                .isNull();
    }

    private static Role superAdminRole() {
        return Role.builder()
                .id(1L)
                .name("超级管理员")
                .code(Authorization.SUPER_ADMIN_ROLE)
                .status(EnableStatus.ENABLED)
                .builtin(true)
                .build();
    }
}
