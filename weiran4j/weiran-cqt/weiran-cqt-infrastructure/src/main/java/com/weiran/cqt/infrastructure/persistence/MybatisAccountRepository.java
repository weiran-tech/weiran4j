package com.weiran.cqt.infrastructure.persistence;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.weiran.cqt.domain.account.Account;
import com.weiran.cqt.domain.account.AccountRepository;
import com.weiran.cqt.domain.account.CredentialType;
import com.weiran.cqt.infrastructure.persistence.entity.CqtPortalAccountDO;
import com.weiran.cqt.infrastructure.persistence.mapper.CqtPortalAccountMapper;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Objects;
import java.util.Optional;
import java.util.OptionalInt;
import org.jspecify.annotations.Nullable;

/** {@link AccountRepository} 的 MyBatis-Plus 实现。 */
public class MybatisAccountRepository implements AccountRepository {

    /** 旧数据手机号可能重复：与原系统一致，中戏库优先、其次 ID 最小。 */
    private static final String FIRST_BY_SOURCE_THEN_ID =
            "ORDER BY FIELD(source_database, 'zhongxi', 'qudao'), id LIMIT 1";

    private final CqtPortalAccountMapper accountMapper;

    private final Clock clock;

    /** 构造仓储。 */
    public MybatisAccountRepository(final CqtPortalAccountMapper accountMapper, final Clock clock) {
        this.accountMapper = accountMapper;
        this.clock = clock;
    }

    @Override
    public Optional<Account> findFirstByPhone(final String phone) {
        return Optional.ofNullable(this.accountMapper.selectOne(Wrappers.lambdaQuery(CqtPortalAccountDO.class)
                        .eq(CqtPortalAccountDO::getPhoneValue, phone)
                        .last(MybatisAccountRepository.FIRST_BY_SOURCE_THEN_ID)))
                .map(MybatisAccountRepository::toDomain);
    }

    @Override
    public boolean existsByPhone(final String phone) {
        return this.accountMapper.exists(
                Wrappers.lambdaQuery(CqtPortalAccountDO.class).eq(CqtPortalAccountDO::getPhoneValue, phone));
    }

    @Override
    public boolean existsPersonalCredential(
            final CredentialType type, final String credential, final @Nullable Long excludeId) {
        return this.accountMapper.exists(Wrappers.lambdaQuery(CqtPortalAccountDO.class)
                .eq(CqtPortalAccountDO::getUserType, 1)
                .eq(CqtPortalAccountDO::getCredentialType, type.name())
                .eq(CqtPortalAccountDO::getIdCardValue, credential)
                .ne(excludeId != null, CqtPortalAccountDO::getId, excludeId));
    }

    @Override
    public long nextLegacyUserId(final String sourceDatabase) {
        return this.accountMapper.nextLegacyUserId(sourceDatabase);
    }

    @Override
    public long insert(final Account account) {
        final CqtPortalAccountDO row = MybatisAccountRepository.toRow(account);
        row.setPasswordHash(account.getPasswordHash());
        row.setTokenVersion(account.getTokenVersion());
        final LocalDateTime now = LocalDateTime.now(this.clock);
        row.setCreatedAt(now);
        row.setUpdatedAt(now);
        this.accountMapper.insert(row);
        return row.getId();
    }

    @Override
    public Optional<Account> findById(final long id) {
        return Optional.ofNullable(this.accountMapper.selectById(id)).map(MybatisAccountRepository::toDomain);
    }

    @Override
    public void updateProfile(final Account account) {
        // 密码哈希与令牌版本留 null：updateById 跳过 null 字段，二者只能由 resetPasswordByPhone 修改。
        final CqtPortalAccountDO row = MybatisAccountRepository.toRow(account);
        row.setId(account.requireId());
        row.setUpdatedAt(LocalDateTime.now(this.clock));
        this.accountMapper.updateById(row);
    }

    @Override
    public int resetPasswordByPhone(final String phone, final String passwordHash) {
        return this.accountMapper.resetPasswordByPhone(phone, passwordHash, LocalDateTime.now(this.clock));
    }

    @Override
    public OptionalInt findTokenVersion(final long id) {
        final CqtPortalAccountDO row = this.accountMapper.selectOne(Wrappers.lambdaQuery(CqtPortalAccountDO.class)
                .select(CqtPortalAccountDO::getId, CqtPortalAccountDO::getTokenVersion)
                .eq(CqtPortalAccountDO::getId, id));
        return row == null || row.getTokenVersion() == null
                ? OptionalInt.empty()
                : OptionalInt.of(row.getTokenVersion());
    }

    private static CqtPortalAccountDO toRow(final Account account) {
        final CqtPortalAccountDO row = new CqtPortalAccountDO();
        row.setSourceDatabase(account.getSourceDatabase());
        row.setLegacyUserId(account.getLegacyUserId());
        row.setNameValue(account.getName());
        row.setUserType(account.getUserType());
        row.setLegacyUniid(account.getUniid());
        row.setPhoneValue(account.getPhone());
        row.setLegacySchoolId(account.getSchoolId());
        row.setIdCardValue(account.getIdCard());
        row.setCredentialType(account.getCredentialType().name());
        row.setCityLegacyId(account.getCityId());
        row.setSex(account.getSex());
        row.setSchoolValue(account.getSchool());
        row.setContactValue(account.getContact());
        row.setAddressValue(account.getAddress());
        row.setEmail(account.getEmail());
        row.setAuditStatus(account.getAuditStatus());
        row.setLicenseFile(account.getLicense());
        row.setCommitmentFile(account.getCommitment());
        row.setRejectionReason(account.getRejectionReason());
        return row;
    }

    private static Account toDomain(final CqtPortalAccountDO row) {
        return Account.builder()
                .id(row.getId())
                .sourceDatabase(Objects.requireNonNullElse(row.getSourceDatabase(), ""))
                .legacyUserId(Objects.requireNonNullElse(row.getLegacyUserId(), 0L))
                .name(Objects.requireNonNullElse(row.getNameValue(), ""))
                .passwordHash(Objects.requireNonNullElse(row.getPasswordHash(), ""))
                .userType(row.getUserType())
                .uniid(row.getLegacyUniid())
                .phone(row.getPhoneValue())
                .schoolId(row.getLegacySchoolId())
                .idCard(row.getIdCardValue())
                .credentialType(CredentialType.ofStored(row.getCredentialType()))
                .cityId(row.getCityLegacyId())
                .sex(row.getSex())
                .school(row.getSchoolValue())
                .contact(row.getContactValue())
                .address(row.getAddressValue())
                .email(row.getEmail())
                .auditStatus(row.getAuditStatus())
                .license(row.getLicenseFile())
                .commitment(row.getCommitmentFile())
                .rejectionReason(row.getRejectionReason())
                .tokenVersion(Objects.requireNonNullElse(row.getTokenVersion(), 0))
                .build();
    }
}
