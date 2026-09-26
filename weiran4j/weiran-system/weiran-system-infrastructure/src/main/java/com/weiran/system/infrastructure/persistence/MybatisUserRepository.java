package com.weiran.system.infrastructure.persistence;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.weiran.common.page.PageQuery;
import com.weiran.common.page.PageResult;
import com.weiran.common.status.EnableStatus;
import com.weiran.framework.persistence.Likes;
import com.weiran.framework.persistence.MybatisPages;
import com.weiran.system.domain.user.Gender;
import com.weiran.system.domain.user.User;
import com.weiran.system.domain.user.UserCriteria;
import com.weiran.system.domain.user.UserRepository;
import com.weiran.system.infrastructure.persistence.entity.SysUserDO;
import com.weiran.system.infrastructure.persistence.entity.SysUserRoleDO;
import com.weiran.system.infrastructure.persistence.mapper.SysUserMapper;
import com.weiran.system.infrastructure.persistence.mapper.SysUserRoleMapper;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/** {@link UserRepository} 的 MyBatis-Plus 实现。 */
public class MybatisUserRepository implements UserRepository {

    private final SysUserMapper userMapper;

    private final SysUserRoleMapper userRoleMapper;

    /** 构造仓储。 */
    public MybatisUserRepository(final SysUserMapper userMapper, final SysUserRoleMapper userRoleMapper) {
        this.userMapper = userMapper;
        this.userRoleMapper = userRoleMapper;
    }

    @Override
    public Optional<User> findById(final long id) {
        return Optional.ofNullable(this.userMapper.selectById(id)).map(MybatisUserRepository::toDomain);
    }

    @Override
    public Optional<User> findByUsername(final String username) {
        return Optional.ofNullable(this.userMapper.selectOne(
                        Wrappers.lambdaQuery(SysUserDO.class).eq(SysUserDO::getUsername, username)))
                .map(MybatisUserRepository::toDomain);
    }

    @Override
    public boolean existsByUsername(final String username) {
        return this.userMapper.exists(Wrappers.lambdaQuery(SysUserDO.class).eq(SysUserDO::getUsername, username));
    }

    @Override
    public long insert(final User user) {
        final SysUserDO row = MybatisUserRepository.toDataObject(user);
        this.userMapper.insert(row);
        return row.getId();
    }

    @Override
    public void updateProfile(final User user) {
        final SysUserDO row = new SysUserDO();
        row.setId(user.requireId());
        this.userMapper.update(
                row,
                Wrappers.lambdaUpdate(SysUserDO.class)
                        .set(SysUserDO::getNickname, user.getNickname())
                        .set(SysUserDO::getEmail, user.getEmail())
                        .set(SysUserDO::getPhone, user.getPhone())
                        .set(SysUserDO::getAvatar, user.getAvatar())
                        .set(SysUserDO::getGender, user.getGender().value())
                        .eq(SysUserDO::getId, user.requireId()));
    }

    @Override
    public void updateAccount(final User user) {
        // 传入只带 ID 的实体是为了触发审计字段填充（updated_at / updated_by）；实体其余字段为空不参与 SET。
        final SysUserDO row = new SysUserDO();
        row.setId(user.requireId());
        this.userMapper.update(
                row,
                Wrappers.lambdaUpdate(SysUserDO.class)
                        .set(SysUserDO::getNickname, user.getNickname())
                        .set(SysUserDO::getEmail, user.getEmail())
                        .set(SysUserDO::getPhone, user.getPhone())
                        .set(SysUserDO::getGender, user.getGender().value())
                        .set(SysUserDO::getDepartmentId, user.getDepartmentId())
                        .set(SysUserDO::getStatus, user.getStatus().value())
                        .eq(SysUserDO::getId, user.requireId()));
    }

    @Override
    public void recordLogin(final long id, final String ip, final LocalDateTime at) {
        this.userMapper.update(Wrappers.lambdaUpdate(SysUserDO.class)
                .set(SysUserDO::getLastLoginAt, at)
                .set(SysUserDO::getLastLoginIp, ip)
                .eq(SysUserDO::getId, id));
    }

    @Override
    public void changePassword(final long id, final String passwordHash, final LocalDateTime at) {
        this.userMapper.update(Wrappers.lambdaUpdate(SysUserDO.class)
                .set(SysUserDO::getPassword, passwordHash)
                .set(SysUserDO::getPasswordUpdatedAt, at)
                .setSql("token_version = token_version + 1")
                .eq(SysUserDO::getId, id));
    }

    @Override
    public void revokeTokens(final long id) {
        this.userMapper.update(Wrappers.lambdaUpdate(SysUserDO.class)
                .setSql("token_version = token_version + 1")
                .eq(SysUserDO::getId, id));
    }

    @Override
    public void deleteById(final long id) {
        this.userRoleMapper.delete(Wrappers.lambdaQuery(SysUserRoleDO.class).eq(SysUserRoleDO::getUserId, id));
        this.userMapper.deleteById(id);
    }

    @Override
    public PageResult<User> page(final UserCriteria criteria, final PageQuery pageQuery) {
        final String keyword = criteria.keyword();
        final EnableStatus status = criteria.status();
        final Set<Long> departmentIds = criteria.departmentIds();
        final LambdaQueryWrapper<SysUserDO> wrapper = Wrappers.lambdaQuery(SysUserDO.class)
                .and(
                        keyword != null,
                        w -> w.like(SysUserDO::getUsername, Likes.escape(keyword))
                                .or()
                                .like(SysUserDO::getNickname, Likes.escape(keyword))
                                .or()
                                .like(SysUserDO::getPhone, Likes.escape(keyword)))
                .eq(status != null, SysUserDO::getStatus, status == null ? null : status.value())
                .in(departmentIds != null, SysUserDO::getDepartmentId, departmentIds)
                .orderByAsc(SysUserDO::getId);
        return MybatisPages.toResult(
                this.userMapper.selectPage(MybatisPages.of(pageQuery), wrapper),
                pageQuery,
                MybatisUserRepository::toDomain);
    }

    @Override
    public List<User> findEnabled() {
        return this.userMapper
                .selectList(Wrappers.lambdaQuery(SysUserDO.class)
                        .eq(SysUserDO::getStatus, EnableStatus.ENABLED.value())
                        .orderByAsc(SysUserDO::getId))
                .stream()
                .map(MybatisUserRepository::toDomain)
                .toList();
    }

    @Override
    public List<User> findByIds(final Collection<Long> ids) {
        if (ids.isEmpty()) {
            return List.of();
        }
        return this.userMapper.selectByIds(ids).stream()
                .map(MybatisUserRepository::toDomain)
                .toList();
    }

    @Override
    public long countByDepartmentId(final long departmentId) {
        return this.userMapper.selectCount(
                Wrappers.lambdaQuery(SysUserDO.class).eq(SysUserDO::getDepartmentId, departmentId));
    }

    @Override
    public Set<Long> findRoleIds(final long userId) {
        return this.userRoleMapper
                .selectList(Wrappers.lambdaQuery(SysUserRoleDO.class).eq(SysUserRoleDO::getUserId, userId))
                .stream()
                .map(SysUserRoleDO::getRoleId)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    @Override
    public Map<Long, Set<Long>> findRoleIdsByUserIds(final Collection<Long> userIds) {
        final Map<Long, Set<Long>> result = new HashMap<>();
        if (userIds.isEmpty()) {
            return result;
        }
        this.userRoleMapper
                .selectList(Wrappers.lambdaQuery(SysUserRoleDO.class).in(SysUserRoleDO::getUserId, userIds))
                .forEach(link -> result.computeIfAbsent(link.getUserId(), key -> new LinkedHashSet<>())
                        .add(link.getRoleId()));
        return result;
    }

    @Override
    public void replaceRoles(final long userId, final Collection<Long> roleIds) {
        this.userRoleMapper.delete(Wrappers.lambdaQuery(SysUserRoleDO.class).eq(SysUserRoleDO::getUserId, userId));
        for (final Long roleId : new LinkedHashSet<>(roleIds)) {
            final SysUserRoleDO link = new SysUserRoleDO();
            link.setUserId(userId);
            link.setRoleId(roleId);
            this.userRoleMapper.insert(link);
        }
    }

    private static User toDomain(final SysUserDO row) {
        return User.builder()
                .id(row.getId())
                .username(row.getUsername())
                .nickname(row.getNickname())
                .passwordHash(row.getPassword())
                .email(row.getEmail())
                .phone(row.getPhone())
                .avatar(row.getAvatar())
                .gender(Gender.of(row.getGender()))
                .departmentId(row.getDepartmentId())
                .status(EnableStatus.of(row.getStatus()))
                .tokenVersion(row.getTokenVersion() == null ? 0 : row.getTokenVersion())
                .lastLoginAt(row.getLastLoginAt())
                .lastLoginIp(row.getLastLoginIp())
                .passwordUpdatedAt(row.getPasswordUpdatedAt())
                .builtin(Boolean.TRUE.equals(row.getIsBuiltin()))
                .createdAt(row.getCreatedAt())
                .updatedAt(row.getUpdatedAt())
                .build();
    }

    private static SysUserDO toDataObject(final User user) {
        final SysUserDO row = new SysUserDO();
        row.setId(user.getId());
        row.setUsername(user.getUsername());
        row.setNickname(user.getNickname());
        row.setPassword(user.getPasswordHash());
        row.setEmail(user.getEmail());
        row.setPhone(user.getPhone());
        row.setAvatar(user.getAvatar());
        row.setGender(user.getGender().value());
        row.setDepartmentId(user.getDepartmentId());
        row.setStatus(user.getStatus().value());
        row.setTokenVersion(user.getTokenVersion());
        row.setLastLoginAt(user.getLastLoginAt());
        row.setLastLoginIp(user.getLastLoginIp());
        row.setPasswordUpdatedAt(user.getPasswordUpdatedAt());
        row.setIsBuiltin(user.isBuiltin());
        return row;
    }
}
