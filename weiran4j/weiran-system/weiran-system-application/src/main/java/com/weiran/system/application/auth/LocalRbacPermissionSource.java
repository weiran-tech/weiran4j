package com.weiran.system.application.auth;

import com.weiran.system.domain.auth.Authorization;
import com.weiran.system.domain.auth.PermissionSource;
import com.weiran.system.domain.auth.PrincipalSnapshot;
import com.weiran.system.domain.menu.MenuRepository;
import com.weiran.system.domain.user.User;
import com.weiran.system.domain.user.UserRepository;
import java.util.Optional;
import org.jspecify.annotations.Nullable;

/** 本地 RBAC 权限来源：用户的启用角色 → 角色授予的菜单 → 权限码；结果走 30 秒快照缓存。 */
public class LocalRbacPermissionSource implements PermissionSource {

    private final UserRepository userRepository;

    private final MenuRepository menuRepository;

    private final AuthorizationResolver authorizationResolver;

    private final AuthSnapshotCache cache;

    /** 构造权限来源。 */
    public LocalRbacPermissionSource(
            final UserRepository userRepository,
            final MenuRepository menuRepository,
            final AuthorizationResolver authorizationResolver,
            final AuthSnapshotCache cache) {
        this.userRepository = userRepository;
        this.menuRepository = menuRepository;
        this.authorizationResolver = authorizationResolver;
        this.cache = cache;
    }

    @Override
    public Optional<PrincipalSnapshot> load(final long userId) {
        return this.cache.get(userId, this::loadUncached);
    }

    private @Nullable PrincipalSnapshot loadUncached(final Long userId) {
        final Optional<User> found = this.userRepository.findById(userId);
        if (found.isEmpty()) {
            return null;
        }
        final User user = found.get();
        final Authorization authorization = this.authorizationResolver.resolve(userId);
        return new PrincipalSnapshot(
                user.getUsername(),
                user.getNickname(),
                authorization.roleCodes(),
                authorization.permissions(this.menuRepository.findAll()));
    }
}
