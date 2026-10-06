package com.weiran.system.application.auth;

import com.weiran.common.status.EnableStatus;
import com.weiran.common.text.Texts;
import com.weiran.system.domain.identity.ExternalIdentity;
import com.weiran.system.domain.identity.ExternalIdentityProvider;
import com.weiran.system.domain.identity.UserIdentity;
import com.weiran.system.domain.identity.UserIdentityRepository;
import com.weiran.system.domain.role.Role;
import com.weiran.system.domain.role.RoleRepository;
import com.weiran.system.domain.user.Gender;
import com.weiran.system.domain.user.User;
import com.weiran.system.domain.user.UserRepository;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.transaction.annotation.Transactional;

/**
 * 外部身份自动开通：建本地用户（没有本地密码、默认角色）并绑定，三步在同一事务里（D-015）。
 *
 * <p>单独成 Bean 是为了让 {@code @Transactional} 生效（同类自调用绕过代理）。
 */
public class IdentityProvisioner {

    private static final int MAX_NICKNAME_LENGTH = 32;

    private static final int MAX_EMAIL_LENGTH = 128;

    private final UserRepository userRepository;

    private final RoleRepository roleRepository;

    private final UserIdentityRepository identityRepository;

    private final Clock clock;

    /** 构造开通器。 */
    public IdentityProvisioner(
            final UserRepository userRepository,
            final RoleRepository roleRepository,
            final UserIdentityRepository identityRepository,
            final Clock clock) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.identityRepository = identityRepository;
        this.clock = clock;
    }

    /**
     * 开通并绑定，返回新用户 ID。
     *
     * @param username 已确认不与本地用户冲突的用户名
     */
    @Transactional
    public long provision(
            final ExternalIdentityProvider provider, final ExternalIdentity identity, final String username) {
        final LocalDateTime now = LocalDateTime.now(this.clock);
        final String displayName = identity.displayName();
        final String nickname = Texts.truncate(
                displayName == null || displayName.isBlank() ? username : displayName.strip(), MAX_NICKNAME_LENGTH);
        final String email = identity.email();
        final User user = User.builder()
                .username(username)
                .nickname(nickname)
                // 空串 = 没有本地密码：sys_user.password 非空，BCrypt 永远匹配不上它（User#hasPassword）。
                .passwordHash("")
                .email(email == null ? null : Texts.truncate(email, MAX_EMAIL_LENGTH))
                .gender(Gender.UNKNOWN)
                .status(EnableStatus.ENABLED)
                .tokenVersion(0)
                .builtin(false)
                .build();
        final long userId = this.userRepository.insert(user);
        final List<Long> roleIds = this.roleRepository.findEnabled().stream()
                .filter(role -> provider.defaultRoleCodes().contains(role.getCode()))
                .map(Role::requireId)
                .toList();
        if (!roleIds.isEmpty()) {
            this.userRepository.replaceRoles(userId, roleIds);
        }
        this.identityRepository.insert(new UserIdentity(
                null, userId, provider.id(), identity.externalId(), Texts.trimToNull(displayName), now, userId));
        return userId;
    }
}
