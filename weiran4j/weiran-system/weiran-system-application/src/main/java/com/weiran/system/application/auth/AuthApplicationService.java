package com.weiran.system.application.auth;

import com.weiran.common.error.BizException;
import com.weiran.common.error.CommonErrors;
import com.weiran.common.text.Texts;
import com.weiran.framework.web.UserAgentInfo;
import com.weiran.framework.web.UserAgentParser;
import com.weiran.system.api.auth.AuthService;
import com.weiran.system.api.auth.ChangePasswordCommand;
import com.weiran.system.api.auth.ClientContext;
import com.weiran.system.api.auth.CurrentUserView;
import com.weiran.system.api.auth.LoginCommand;
import com.weiran.system.api.auth.LoginResult;
import com.weiran.system.api.auth.UpdateProfileCommand;
import com.weiran.system.api.menu.MenuNode;
import com.weiran.system.application.menu.MenuAssembler;
import com.weiran.system.domain.auth.Authorization;
import com.weiran.system.domain.auth.TokenClaims;
import com.weiran.system.domain.auth.TokenCodec;
import com.weiran.system.domain.department.Department;
import com.weiran.system.domain.department.DepartmentRepository;
import com.weiran.system.domain.loginlog.LoginLog;
import com.weiran.system.domain.loginlog.LoginLogRepository;
import com.weiran.system.domain.menu.Menu;
import com.weiran.system.domain.menu.MenuRepository;
import com.weiran.system.domain.user.Gender;
import com.weiran.system.domain.user.PasswordHasher;
import com.weiran.system.domain.user.PasswordPolicy;
import com.weiran.system.domain.user.User;
import com.weiran.system.domain.user.UserRepository;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import lombok.extern.slf4j.Slf4j;
import org.jspecify.annotations.Nullable;
import org.springframework.transaction.annotation.Transactional;

/**
 * 认证用例。
 *
 * <p>{@link #login} 刻意不开事务：失败分支要先写登录日志再抛异常，放在事务里日志会随异常一起回滚。
 */
@Slf4j
public class AuthApplicationService implements AuthService {

    /** 令牌类型。 */
    public static final String TOKEN_TYPE = "Bearer";

    /**
     * 用户名不存在时拿来空跑一次 BCrypt 的哈希（cost 10，与生产强度一致）。
     *
     * <p>不跑的话，不存在的用户名约 1ms 就返回、存在的约 100ms，响应时间本身就泄露了用户名是否存在。
     */
    private static final String DUMMY_HASH = "$2a$10$Ta2ng6/OKD8cvUpXegEZrugy0w.BoRK9aqM/xhVFQkIImx4.LMPQG";

    private static final int MAX_USERNAME_LENGTH = 64;

    private static final int MAX_USER_AGENT_LENGTH = 512;

    private static final int MAX_BROWSER_LENGTH = 64;

    private final UserRepository userRepository;

    private final MenuRepository menuRepository;

    private final DepartmentRepository departmentRepository;

    private final LoginLogRepository loginLogRepository;

    private final PasswordHasher passwordHasher;

    private final TokenCodec tokenCodec;

    private final AuthorizationResolver authorizationResolver;

    private final AuthSnapshotCache cache;

    private final Clock clock;

    /** 构造服务。 */
    public AuthApplicationService(
            final UserRepository userRepository,
            final MenuRepository menuRepository,
            final DepartmentRepository departmentRepository,
            final LoginLogRepository loginLogRepository,
            final PasswordHasher passwordHasher,
            final TokenCodec tokenCodec,
            final AuthorizationResolver authorizationResolver,
            final AuthSnapshotCache cache,
            final Clock clock) {
        this.userRepository = userRepository;
        this.menuRepository = menuRepository;
        this.departmentRepository = departmentRepository;
        this.loginLogRepository = loginLogRepository;
        this.passwordHasher = passwordHasher;
        this.tokenCodec = tokenCodec;
        this.authorizationResolver = authorizationResolver;
        this.cache = cache;
        this.clock = clock;
    }

    @Override
    public LoginResult login(final LoginCommand command, final ClientContext client) {
        final String username = command.username().strip();
        final Optional<User> found = this.userRepository.findByUsername(username);
        // 用户不存在与密码错误共用 40101，且提示语一致，防止通过登录接口枚举用户名。
        final String hash = found.map(User::getPasswordHash).orElse(AuthApplicationService.DUMMY_HASH);
        final boolean passwordMatches = this.passwordHasher.matches(command.password(), hash);
        if (found.isEmpty() || !passwordMatches) {
            final Long userId = found.map(User::getId).orElse(null);
            this.appendLog(userId, username, client, LoginLog.EVENT_LOGIN, LoginLog.STATUS_FAIL, "用户名或密码错误");
            throw new BizException(CommonErrors.BAD_CREDENTIALS);
        }
        final User user = found.get();
        if (!user.isEnabled()) {
            this.appendLog(user.getId(), username, client, LoginLog.EVENT_LOGIN, LoginLog.STATUS_FAIL, "账号已禁用");
            throw new BizException(CommonErrors.ACCOUNT_DISABLED);
        }
        final LocalDateTime now = LocalDateTime.now(this.clock);
        // 定向更新登录信息：整行写回会覆盖并发发生的改密 / 禁用。
        this.userRepository.recordLogin(user.requireId(), client.ip(), now);
        final String token =
                this.tokenCodec.issue(new TokenClaims(user.requireId(), user.getUsername(), user.getTokenVersion()));
        this.appendLog(user.getId(), user.getUsername(), client, LoginLog.EVENT_LOGIN, LoginLog.STATUS_SUCCESS, "登录成功");
        return new LoginResult(
                token, AuthApplicationService.TOKEN_TYPE, this.tokenCodec.ttl().toSeconds());
    }

    @Override
    public void logout(final long userId, final ClientContext client) {
        final String username =
                this.userRepository.findById(userId).map(User::getUsername).orElse("");
        this.appendLog(userId, username, client, LoginLog.EVENT_LOGOUT, LoginLog.STATUS_SUCCESS, "登出成功");
    }

    @Override
    @Transactional(readOnly = true)
    public CurrentUserView me(final long userId) {
        final User user = this.requireUser(userId);
        final Authorization authorization = this.authorizationResolver.resolve(userId);
        final Long departmentId = user.getDepartmentId();
        final String departmentName = departmentId == null
                ? null
                : this.departmentRepository
                        .findById(departmentId)
                        .map(Department::getName)
                        .orElse(null);
        return new CurrentUserView(
                userId,
                user.getUsername(),
                user.getNickname(),
                user.getEmail(),
                user.getPhone(),
                user.getAvatar(),
                user.getGender().value(),
                departmentId,
                departmentName,
                List.copyOf(authorization.roleCodes()),
                List.copyOf(authorization.displayPermissions(this.menuRepository.findAll())));
    }

    @Override
    @Transactional(readOnly = true)
    public List<MenuNode> menus(final long userId) {
        this.requireUser(userId);
        final List<Menu> visible =
                this.authorizationResolver.resolve(userId).visibleMenus(this.menuRepository.findAll());
        return MenuAssembler.tree(visible);
    }

    @Override
    @Transactional
    public void updateProfile(final long userId, final UpdateProfileCommand command) {
        final User user = this.requireUser(userId);
        this.userRepository.updateProfile(user.withProfile(
                command.nickname().strip(),
                Texts.trimToNull(command.email()),
                Texts.trimToNull(command.phone()),
                Texts.trimToNull(command.avatar()),
                command.gender() == null ? user.getGender() : Gender.of(command.gender())));
        this.cache.evict(userId);
    }

    @Override
    @Transactional
    public void changePassword(final long userId, final ChangePasswordCommand command) {
        final User user = this.requireUser(userId);
        if (!this.passwordHasher.matches(command.oldPassword(), user.getPasswordHash())) {
            throw BizException.badRequest("oldPassword: 原密码不正确");
        }
        PasswordPolicy.validate("newPassword", command.newPassword());
        this.userRepository.changePassword(
                userId, this.passwordHasher.hash(command.newPassword()), LocalDateTime.now(this.clock));
        this.cache.evict(userId);
    }

    private User requireUser(final long userId) {
        // 令牌有效但用户已被删除：按「登录失效」处理，前端会跳回登录页。
        return this.userRepository.findById(userId).orElseThrow(() -> new BizException(CommonErrors.UNAUTHORIZED));
    }

    private void appendLog(
            final @Nullable Long userId,
            final String username,
            final ClientContext client,
            final String eventType,
            final String status,
            final String message) {
        final UserAgentInfo agent = UserAgentParser.parse(client.userAgent());
        this.loginLogRepository.append(new LoginLog(
                null,
                userId,
                Texts.truncate(username, AuthApplicationService.MAX_USERNAME_LENGTH),
                client.ip(),
                Texts.truncate(client.userAgent(), AuthApplicationService.MAX_USER_AGENT_LENGTH),
                Texts.truncate(agent.browser(), AuthApplicationService.MAX_BROWSER_LENGTH),
                Texts.truncate(agent.os(), AuthApplicationService.MAX_BROWSER_LENGTH),
                eventType,
                status,
                message,
                LocalDateTime.now(this.clock)));
    }
}
