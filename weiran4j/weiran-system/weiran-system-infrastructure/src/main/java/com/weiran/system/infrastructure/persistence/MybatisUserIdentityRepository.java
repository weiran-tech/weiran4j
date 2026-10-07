package com.weiran.system.infrastructure.persistence;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.weiran.system.domain.identity.UserIdentity;
import com.weiran.system.domain.identity.UserIdentityRepository;
import com.weiran.system.infrastructure.persistence.entity.SysUserIdentityDO;
import com.weiran.system.infrastructure.persistence.mapper.SysUserIdentityMapper;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

/** {@link UserIdentityRepository} 的 MyBatis-Plus 实现。 */
public class MybatisUserIdentityRepository implements UserIdentityRepository {

    private final SysUserIdentityMapper mapper;

    /** 构造仓储。 */
    public MybatisUserIdentityRepository(final SysUserIdentityMapper mapper) {
        this.mapper = mapper;
    }

    @Override
    public Optional<UserIdentity> findByProviderAndExternalId(final String provider, final String externalId) {
        return Optional.ofNullable(this.mapper.selectOne(Wrappers.lambdaQuery(SysUserIdentityDO.class)
                        .eq(SysUserIdentityDO::getProvider, provider)
                        .eq(SysUserIdentityDO::getExternalId, externalId)))
                .map(MybatisUserIdentityRepository::toDomain);
    }

    @Override
    public List<UserIdentity> findByUserId(final long userId) {
        return this.mapper
                .selectList(Wrappers.lambdaQuery(SysUserIdentityDO.class)
                        .eq(SysUserIdentityDO::getUserId, userId)
                        .orderByAsc(SysUserIdentityDO::getId))
                .stream()
                .map(MybatisUserIdentityRepository::toDomain)
                .toList();
    }

    @Override
    public Optional<UserIdentity> findById(final long id) {
        return Optional.ofNullable(this.mapper.selectById(id)).map(MybatisUserIdentityRepository::toDomain);
    }

    @Override
    public long insert(final UserIdentity identity) {
        final SysUserIdentityDO row = new SysUserIdentityDO();
        row.setUserId(identity.userId());
        row.setProvider(identity.provider());
        row.setExternalId(identity.externalId());
        row.setDisplayName(identity.displayName());
        row.setCreatedAt(identity.createdAt());
        row.setCreatedBy(identity.createdBy());
        this.mapper.insert(row);
        return Objects.requireNonNull(row.getId(), "插入后未回填 ID");
    }

    @Override
    public void deleteById(final long id) {
        this.mapper.deleteById(id);
    }

    @Override
    public void deleteByUserId(final long userId) {
        this.mapper.delete(Wrappers.lambdaQuery(SysUserIdentityDO.class).eq(SysUserIdentityDO::getUserId, userId));
    }

    private static UserIdentity toDomain(final SysUserIdentityDO row) {
        return new UserIdentity(
                row.getId(),
                Objects.requireNonNull(row.getUserId()),
                Objects.requireNonNull(row.getProvider()),
                Objects.requireNonNull(row.getExternalId()),
                row.getDisplayName(),
                row.getCreatedAt(),
                row.getCreatedBy());
    }
}
