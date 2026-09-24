package com.weiran.system.application.auth;

import com.kjs.wuli3.core.error.ErrorCodeException;
import com.kjs.wuli3.core.time.ClockProvider;
import com.weiran.system.api.auth.AuthService;
import com.weiran.system.api.auth.LoginCommand;
import com.weiran.system.api.auth.LoginResult;
import com.weiran.system.domain.account.Account;
import com.weiran.system.domain.account.AccountType;
import com.weiran.system.domain.error.SystemErrors;
import com.weiran.system.domain.port.AccessTokenIssuer;
import com.weiran.system.domain.port.AccountRepository;
import com.weiran.system.domain.port.PasswordHasher;
import com.weiran.system.domain.port.PasswordStampFactory;
import com.weiran.system.domain.port.RbacRepository;
import com.weiran.system.domain.rbac.AuthorizedPrincipal;
import java.time.LocalDateTime;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.transaction.annotation.Transactional;

/**
 * 登录与当前用户用例。
 *
 * <p>登录链路的顺序是有意的：先查账号 → 再校验可登录性 → 最后验密码。
 * 把密码校验放最后，是为了让被禁用账号即使密码正确也拿不到令牌；
 * 而无论账号是否存在都返回同一个 {@link SystemErrors#BAD_CREDENTIALS}，避免账号枚举。
 */
@Slf4j
@RequiredArgsConstructor
public class AuthApplicationService implements AuthService {

    private final AccountRepository accountRepository;

    private final RbacRepository rbacRepository;

    private final PasswordHasher passwordHasher;

    private final PasswordStampFactory passwordStampFactory;

    private final AccessTokenIssuer accessTokenIssuer;

    private final ClockProvider clockProvider;

    @Override
    @Transactional
    public LoginResult login(final LoginCommand command) {
        final AccountType accountType = AccountType.fromCode(command.guard());
        final Account account = this.accountRepository
                .findByPassport(command.passport(), accountType)
                .orElseThrow(() -> new ErrorCodeException(SystemErrors.BAD_CREDENTIALS));

        account.ensureLoginable(this.now());
        this.verifyPassword(account, command.password());

        final AccessTokenIssuer.IssuedToken issued = this.accessTokenIssuer.issue(
                account.getId(), account.getType().code(), this.passwordStampFactory.stampOf(account));

        this.accountRepository.recordLogin(account.getId(), this.now(), command.loginIp());

        return new LoginResult(
                issued.token(),
                issued.expiresIn().toSeconds(),
                account.getType().code());
    }

    /**
     * 校验令牌并载入授权快照。
     *
     * <p>除签名与过期之外还比对密码指纹：改过密码的账号，旧令牌立即失效而不是等自然过期。
     */
    public AuthorizedPrincipal authorize(final String token) {
        final AccessTokenIssuer.TokenPayload payload = this.accessTokenIssuer.parse(token);
        final Account account = this.accountRepository
                .findById(payload.accountId())
                .orElseThrow(() -> new ErrorCodeException(SystemErrors.TOKEN_INVALID));

        account.ensureLoginable(this.now());

        if (!this.passwordStampFactory.stampOf(account).equals(payload.stamp())) {
            throw new ErrorCodeException(SystemErrors.TOKEN_STALE);
        }

        final Set<String> roleNames = this.rbacRepository.findRoleNamesByAccountId(account.getId());
        final Set<String> permissionNames = this.rbacRepository.findPermissionNamesByAccountId(account.getId());

        return new AuthorizedPrincipal(
                account.getId(), account.getType().code(), account.displayName(), roleNames, permissionNames);
    }

    /**
     * 校验密码，并在历史哈希验通后就地迁移为当前算法。
     *
     * <p>懒迁移放在这里而不是批处理：批处理拿不到明文，历史哈希只能在用户成功登录的这一刻重算。
     */
    /**
     * 取应用时钟的当前本地时间。
     *
     * <p>{@code ClockProvider} 只暴露 {@code Instant} 与时区，本地时间的换算收在这里一处，
     * 免得各处各自选时区——那正是「测试绿、生产差 8 小时」的经典来源。
     */
    private LocalDateTime now() {
        return LocalDateTime.ofInstant(this.clockProvider.instant(), this.clockProvider.zone());
    }

    private void verifyPassword(final Account account, final String rawPassword) {
        final String storedHash = account.getPasswordHash();
        if (storedHash == null || storedHash.isBlank()) {
            throw new ErrorCodeException(SystemErrors.PASSWORD_NOT_SET);
        }

        final PasswordHasher.VerificationResult result =
                this.passwordHasher.verify(rawPassword, storedHash, account.getPasswordKey(), account.getCreatedAt());
        if (!result.matched()) {
            throw new ErrorCodeException(SystemErrors.BAD_CREDENTIALS);
        }

        if (result.needsRehash()) {
            final PasswordHasher.HashedPassword rehashed = this.passwordHasher.hash(rawPassword);
            this.accountRepository.updatePassword(account.getId(), rehashed.hash(), rehashed.passwordKey());
            AuthApplicationService.log.info("账号 {} 的历史密码哈希已迁移为当前算法", account.getId());
        }
    }
}
