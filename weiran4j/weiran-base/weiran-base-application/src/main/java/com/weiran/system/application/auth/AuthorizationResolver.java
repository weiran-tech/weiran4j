package com.weiran.system.application.auth;

import com.weiran.system.domain.auth.Authorization;
import com.weiran.system.domain.role.Role;
import com.weiran.system.domain.role.RoleRepository;
import com.weiran.system.domain.user.UserRepository;
import java.util.List;
import java.util.Set;

/** 按用户查角色与角色授予的菜单，构造 {@link Authorization}。 */
public class AuthorizationResolver {

    private final UserRepository userRepository;

    private final RoleRepository roleRepository;

    /** 构造解析器。 */
    public AuthorizationResolver(final UserRepository userRepository, final RoleRepository roleRepository) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
    }

    /** 解析用户的授权视图（只有启用角色生效）。 */
    public Authorization resolve(final long userId) {
        final List<Role> roles = this.roleRepository.findByIds(this.userRepository.findRoleIds(userId));
        final Set<Long> menuIds = this.roleRepository.findMenuIdsByRoleIds(Authorization.effectiveRoleIds(roles));
        return Authorization.of(roles, menuIds);
    }
}
