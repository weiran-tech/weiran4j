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

import com.weiran.common.error.BizException;
import com.weiran.common.error.CommonErrors;
import com.weiran.common.status.EnableStatus;
import com.weiran.system.api.auth.AuthenticatedUser;
import com.weiran.system.api.auth.ClientContext;
import com.weiran.system.api.auth.LoginCommand;
import com.weiran.system.api.auth.LoginResult;
import com.weiran.system.domain.auth.TokenClaims;
import com.weiran.system.domain.auth.TokenCodec;
import com.weiran.system.domain.department.DepartmentRepository;
import com.weiran.system.domain.loginlog.LoginLog;
import com.weiran.system.domain.loginlog.LoginLogRepository;
import com.weiran.system.domain.menu.MenuRepository;
import com.weiran.system.domain.user.Gender;
import com.weiran.system.domain.user.PasswordHasher;
import com.weiran.system.domain.user.User;
import com.weiran.system.domain.user.UserRepository;
import java.time.Clock;
import java.time.Duration;
import java.util.Optional;
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
        this.service = new AuthApplicationService(
                this.users,
                mock(MenuRepository.class),
                mock(DepartmentRepository.class),
                this.loginLogs,
                this.hasher,
                this.tokenCodec,
                mock(AuthorizationResolver.class),
                new AuthSnapshotCache(),
                Clock.systemUTC());
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
}
