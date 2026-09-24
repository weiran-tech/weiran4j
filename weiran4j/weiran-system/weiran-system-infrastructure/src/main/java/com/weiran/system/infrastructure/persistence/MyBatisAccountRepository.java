package com.weiran.system.infrastructure.persistence;

import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.weiran.common.page.PageQuery;
import com.weiran.common.page.PageResult;
import com.weiran.system.domain.account.Account;
import com.weiran.system.domain.account.AccountType;
import com.weiran.system.domain.account.PassportType;
import com.weiran.system.domain.port.AccountRepository;
import com.weiran.system.infrastructure.persistence.entity.PamAccountDO;
import com.weiran.system.infrastructure.persistence.mapper.PamAccountMapper;
import java.time.LocalDateTime;
import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.Nullable;

/** 基于 MyBatis-Plus 的账号仓储实现。 */
@RequiredArgsConstructor
public class MyBatisAccountRepository implements AccountRepository {

    private final PamAccountMapper accountMapper;

    @Override
    public Optional<Account> findByPassport(final String passport, final AccountType type) {
        final String trimmed = passport.trim();
        final String column = MyBatisAccountRepository.passportColumn(trimmed);

        final PamAccountDO found = this.accountMapper.selectOne(Wrappers.<PamAccountDO>lambdaQuery()
                .eq(PamAccountDO::getType, type.code())
                .apply(column + " = {0}", trimmed)
                .last("LIMIT 1"));

        return Optional.ofNullable(found).map(MyBatisAccountRepository::toDomain);
    }

    @Override
    public Optional<Account> findById(final long accountId) {
        return Optional.ofNullable(this.accountMapper.selectById(accountId)).map(MyBatisAccountRepository::toDomain);
    }

    @Override
    public void recordLogin(final long accountId, final LocalDateTime loginedAt, final String loginIp) {
        this.accountMapper.update(
                null,
                Wrappers.<PamAccountDO>lambdaUpdate()
                        .eq(PamAccountDO::getId, accountId)
                        .setSql("login_times = login_times + 1")
                        .set(PamAccountDO::getLoginedAt, loginedAt)
                        .set(PamAccountDO::getLoginIp, loginIp));
    }

    @Override
    public void updatePassword(final long accountId, final String passwordHash, final String passwordKey) {
        this.accountMapper.update(
                null,
                Wrappers.<PamAccountDO>lambdaUpdate()
                        .eq(PamAccountDO::getId, accountId)
                        .set(PamAccountDO::getPassword, passwordHash)
                        .set(PamAccountDO::getPasswordKey, passwordKey));
    }

    @Override
    public PageResult<Account> list(
            final PageQuery page, final @Nullable String keyword, final @Nullable AccountType accountType) {
        final IPage<PamAccountDO> result = this.accountMapper.selectPage(
                new Page<>(page.page(), page.size()),
                Wrappers.<PamAccountDO>lambdaQuery()
                        .eq(accountType != null, PamAccountDO::getType, accountType == null ? null : accountType.code())
                        .and(
                                keyword != null,
                                wrapper -> wrapper.like(PamAccountDO::getUsername, keyword)
                                        .or()
                                        .like(PamAccountDO::getMobile, keyword)
                                        .or()
                                        .like(PamAccountDO::getEmail, keyword)));
        return PageResult.of(
                result.getRecords().stream()
                        .map(MyBatisAccountRepository::toDomain)
                        .toList(),
                result.getTotal(),
                page);
    }

    @Override
    public Account insert(final Account account) {
        final PamAccountDO record = MyBatisAccountRepository.toDO(account);
        this.accountMapper.insert(record);
        return account.toBuilder().id(record.getId()).build();
    }

    @Override
    public boolean existsByIdentifier(
            final String username,
            final @Nullable String mobile,
            final @Nullable String email,
            final AccountType type) {
        final Long count = this.accountMapper.selectCount(Wrappers.<PamAccountDO>lambdaQuery()
                .eq(PamAccountDO::getType, type.code())
                .and(wrapper -> {
                    wrapper.eq(PamAccountDO::getUsername, username);
                    if (mobile != null && !mobile.isBlank()) {
                        wrapper.or().eq(PamAccountDO::getMobile, mobile);
                    }
                    if (email != null && !email.isBlank()) {
                        wrapper.or().eq(PamAccountDO::getEmail, email);
                    }
                }));
        return count != null && count > 0;
    }

    @Override
    public void setEnabled(final long accountId, final boolean enabled) {
        this.accountMapper.update(
                null,
                Wrappers.<PamAccountDO>lambdaUpdate()
                        .eq(PamAccountDO::getId, accountId)
                        .set(PamAccountDO::getIsEnable, enabled ? 1 : 0));
    }

    @Override
    public void updateProfile(final long accountId, final @Nullable String mobile, final @Nullable String email) {
        this.accountMapper.update(
                null,
                Wrappers.<PamAccountDO>lambdaUpdate()
                        .eq(PamAccountDO::getId, accountId)
                        .set(PamAccountDO::getMobile, mobile == null ? "" : mobile)
                        .set(PamAccountDO::getEmail, email == null ? "" : email));
    }

    /**
     * 按通行证形态决定查哪一列。
     *
     * <p>列名来自本方法内的白名单常量，不来自入参——通行证内容是用户可控的，
     * 拼进 SQL 片段前必须先落到固定取值上。
     */
    private static String passportColumn(final String passport) {
        return switch (PassportType.detect(passport)) {
            case EMAIL -> "email";
            case MOBILE -> "mobile";
            case USERNAME -> "username";
        };
    }

    private static Account toDomain(final PamAccountDO record) {
        return Account.builder()
                .id(record.getId())
                .username(MyBatisAccountRepository.orEmpty(record.getUsername()))
                .mobile(MyBatisAccountRepository.orEmpty(record.getMobile()))
                .email(MyBatisAccountRepository.orEmpty(record.getEmail()))
                .type(AccountType.fromCode(record.getType()))
                .passwordHash(record.getPassword())
                .passwordKey(record.getPasswordKey())
                .enabled(record.getIsEnable() != null && record.getIsEnable() == 1)
                .disableReason(MyBatisAccountRepository.orEmpty(record.getDisableReason()))
                .disableStartAt(record.getDisableStartAt())
                .disableEndAt(record.getDisableEndAt())
                .loginTimes(record.getLoginTimes() == null ? 0 : record.getLoginTimes())
                .loginedAt(record.getLoginedAt())
                .loginIp(record.getLoginIp())
                .createdAt(record.getCreatedAt())
                .build();
    }

    private static String orEmpty(final String value) {
        return value == null ? "" : value;
    }

    private static PamAccountDO toDO(final Account account) {
        final PamAccountDO record = new PamAccountDO();
        record.setUsername(account.getUsername());
        record.setMobile(account.getMobile());
        record.setEmail(account.getEmail());
        record.setType(account.getType().code());
        record.setPassword(account.getPasswordHash());
        record.setPasswordKey(account.getPasswordKey());
        record.setIsEnable(account.isEnabled() ? 1 : 0);
        record.setDisableReason(account.getDisableReason());
        record.setLoginTimes(account.getLoginTimes());
        record.setCreatedAt(account.getCreatedAt());
        return record;
    }
}
