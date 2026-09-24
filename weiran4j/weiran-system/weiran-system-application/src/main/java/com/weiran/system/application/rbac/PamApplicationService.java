package com.weiran.system.application.rbac;

import com.kjs.wuli3.core.error.ErrorCodeException;
import com.kjs.wuli3.core.time.ClockProvider;
import com.weiran.common.error.WeiranErrors;
import com.weiran.common.page.PageResult;
import com.weiran.system.api.rbac.AccountQuery;
import com.weiran.system.api.rbac.AccountView;
import com.weiran.system.api.rbac.CreateAccountCommand;
import com.weiran.system.api.rbac.LoginLogView;
import com.weiran.system.api.rbac.PamService;
import com.weiran.system.api.rbac.UpdateAccountCommand;
import com.weiran.system.domain.account.Account;
import com.weiran.system.domain.account.AccountType;
import com.weiran.system.domain.error.SystemErrors;
import com.weiran.system.domain.port.AccountRepository;
import com.weiran.system.domain.port.PasswordHasher;
import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;

/**
 * 账号管理用例。
 *
 * <p>与登录鉴权（{@code AuthApplicationService}）共享 {@link AccountRepository}，
 * 但服务不同场景：本类是管理端 CRUD，不做密码校验，也不签发令牌。
 */
@RequiredArgsConstructor
public class PamApplicationService implements PamService {

    private final AccountRepository accountRepository;

    private final PasswordHasher passwordHasher;

    private final ClockProvider clockProvider;

    @Override
    public PageResult<AccountView> list(final AccountQuery query) {
        final AccountType accountType = query.accountType() == null ? null : AccountType.fromCode(query.accountType());
        final PageResult<Account> page = this.accountRepository.list(query.page(), query.keyword(), accountType);
        return new PageResult<>(
                page.items().stream().map(PamApplicationService::toView).toList(),
                page.total(),
                page.page(),
                page.size());
    }

    @Override
    public AccountView findById(final long accountId) {
        return PamApplicationService.toView(this.requireAccount(accountId));
    }

    @Override
    @Transactional
    public AccountView create(final CreateAccountCommand command) {
        final AccountType accountType = AccountType.fromCode(command.accountType());
        if (this.accountRepository.existsByIdentifier(
                command.username(), command.mobile(), command.email(), accountType)) {
            throw new ErrorCodeException(SystemErrors.ACCOUNT_IDENTIFIER_CONFLICT);
        }

        final PasswordHasher.HashedPassword hashed = this.passwordHasher.hash(command.password());
        final Account account = Account.builder()
                .username(command.username())
                .mobile(command.mobile() == null ? "" : command.mobile())
                .email(command.email() == null ? "" : command.email())
                .type(accountType)
                .passwordHash(hashed.hash())
                .passwordKey(hashed.passwordKey())
                .enabled(true)
                .disableReason("")
                .loginTimes(0)
                .createdAt(this.now())
                .build();
        return PamApplicationService.toView(this.accountRepository.insert(account));
    }

    @Override
    @Transactional
    public AccountView update(final long accountId, final UpdateAccountCommand command) {
        this.requireAccount(accountId);
        this.accountRepository.updateProfile(accountId, command.mobile(), command.email());
        return PamApplicationService.toView(this.requireAccount(accountId));
    }

    @Override
    @Transactional
    public void enable(final long accountId) {
        this.requireAccount(accountId);
        this.accountRepository.setEnabled(accountId, true);
    }

    @Override
    @Transactional
    public void disable(final long accountId) {
        this.requireAccount(accountId);
        this.accountRepository.setEnabled(accountId, false);
    }

    @Override
    @Transactional
    public void resetPassword(final long accountId, final String newPassword) {
        this.requireAccount(accountId);
        final PasswordHasher.HashedPassword hashed = this.passwordHasher.hash(newPassword);
        this.accountRepository.updatePassword(accountId, hashed.hash(), hashed.passwordKey());
    }

    @Override
    public PageResult<LoginLogView> loginLogs(final long accountId) {
        final Account account = this.requireAccount(accountId);
        final LoginLogView log = new LoginLogView(account.getLoginedAt(), account.getLoginIp());
        return new PageResult<>(List.of(log), 1L, 1, 1);
    }

    private Account requireAccount(final long accountId) {
        return this.accountRepository
                .findById(accountId)
                .orElseThrow(() -> new ErrorCodeException(WeiranErrors.RESOURCE_NOT_FOUND));
    }

    private LocalDateTime now() {
        return LocalDateTime.ofInstant(this.clockProvider.instant(), this.clockProvider.zone());
    }

    private static AccountView toView(final Account account) {
        return new AccountView(
                account.getId(),
                account.getUsername(),
                account.getMobile(),
                account.getEmail(),
                account.getType().code(),
                account.isEnabled());
    }
}
