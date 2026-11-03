package com.wulicode.weiran.system.application.user;

import com.wulicode.weiran.framework.auth.CurrentUser;
import com.wulicode.weiran.framework.auth.LoginUser;
import com.wulicode.weiran.framework.error.BizException;
import com.wulicode.weiran.framework.error.CommonErrors;
import com.wulicode.weiran.framework.page.PageQuery;
import com.wulicode.weiran.framework.page.PageResult;
import com.wulicode.weiran.framework.status.EnableStatus;
import com.wulicode.weiran.framework.text.Texts;
import com.wulicode.weiran.system.api.user.CreateUserCommand;
import com.wulicode.weiran.system.api.user.UpdateUserAccountFieldCommand;
import com.wulicode.weiran.system.api.user.UpdateUserCommand;
import com.wulicode.weiran.system.api.user.UserAvatarView;
import com.wulicode.weiran.system.api.user.UserOption;
import com.wulicode.weiran.system.api.user.UserQuery;
import com.wulicode.weiran.system.api.user.UserService;
import com.wulicode.weiran.system.api.user.UserView;
import com.wulicode.weiran.system.application.auth.AuthSnapshotCache;
import com.wulicode.weiran.system.domain.auth.Authorization;
import com.wulicode.weiran.system.domain.identity.UserIdentityRepository;
import com.wulicode.weiran.system.domain.role.Role;
import com.wulicode.weiran.system.domain.role.RoleRepository;
import com.wulicode.weiran.system.domain.user.Gender;
import com.wulicode.weiran.system.domain.user.PasswordHasher;
import com.wulicode.weiran.system.domain.user.PasswordPolicy;
import com.wulicode.weiran.system.domain.user.SecuritySettingsRepository;
import com.wulicode.weiran.system.domain.user.User;
import com.wulicode.weiran.system.domain.user.UserAccountField;
import com.wulicode.weiran.system.domain.user.UserCriteria;
import com.wulicode.weiran.system.domain.user.UserRepository;
import com.wulicode.weiran.system.domain.user.UsernamePolicy;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.jspecify.annotations.Nullable;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.transaction.annotation.Transactional;

/** 用户管理用例。 */
public class UserApplicationService implements UserService {

    private final UserRepository userRepository;

    private final RoleRepository roleRepository;

    private final PasswordHasher passwordHasher;

    private final SecuritySettingsRepository securitySettings;

    private final AuthSnapshotCache cache;

    private final Clock clock;

    private final UserIdentityRepository identityRepository;

    /** 构造服务。 */
    public UserApplicationService(
            final UserRepository userRepository,
            final RoleRepository roleRepository,
            final PasswordHasher passwordHasher,
            final SecuritySettingsRepository securitySettings,
            final AuthSnapshotCache cache,
            final Clock clock,
            final UserIdentityRepository identityRepository) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordHasher = passwordHasher;
        this.securitySettings = securitySettings;
        this.cache = cache;
        this.clock = clock;
        this.identityRepository = identityRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public PageResult<UserView> page(final UserQuery query, final PageQuery pageQuery) {
        final UserCriteria criteria = new UserCriteria(
                Texts.trimToNull(query.keyword()),
                EnableStatus.filterOf(query.status()),
                Texts.trimToNull(query.username()),
                query.userId(),
                Texts.trimToNull(query.phone()),
                query.roleId(),
                Gender.filterOf(query.gender()),
                query.createdStartTime(),
                query.createdEndTime(),
                query.lastLoginStartTime(),
                query.lastLoginEndTime());
        final PageResult<User> page = this.userRepository.page(criteria, pageQuery);
        final List<UserView> views = this.toViews(page.list());
        return new PageResult<>(views, page.total(), page.page(), page.pageSize());
    }

    @Override
    @Transactional(readOnly = true)
    public UserView get(final long id) {
        return this.toViews(List.of(this.requireUser(id))).get(0);
    }

    @Override
    @Transactional
    public long create(final CreateUserCommand command) {
        final String username = command.username().strip();
        if (!UsernamePolicy.isValid(username)) {
            throw BizException.badRequest("username: 用户名需为 2–32 位，只能包含小写英文字母、数字和下划线");
        }
        if (this.userRepository.existsByUsername(username)) {
            throw BizException.duplicate("用户名已存在");
        }
        final String phone = Texts.trimToNull(command.phone());
        this.ensurePhoneAvailable(phone, null);
        PasswordPolicy.validate("password", command.password(), this.securitySettings.load());
        this.ensureRolesGrantable(command.roleIds(), Set.of());
        final LocalDateTime now = LocalDateTime.now(this.clock);
        final User user = User.builder()
                .username(username)
                .nickname(command.nickname().strip())
                .passwordHash(this.passwordHasher.hash(command.password()))
                .phone(phone)
                .gender(Gender.of(command.gender()))
                .status(EnableStatus.ofNullable(command.status(), EnableStatus.ENABLED))
                .tokenVersion(0)
                .passwordUpdatedAt(now)
                .builtin(false)
                .build();
        final long id;
        try {
            id = this.userRepository.insert(user);
        } catch (final DuplicateKeyException ex) {
            throw UserDuplicateErrors.from(ex, "用户账号信息已存在");
        }
        this.userRepository.replaceRoles(id, command.roleIds());
        return id;
    }

    @Override
    @Transactional
    public void update(final long id, final UpdateUserCommand command) {
        final User user = this.requireUser(id);
        final Set<Long> currentRoleIds = this.userRepository.findRoleIds(id);
        final List<Role> roles = this.ensureRolesGrantable(command.roleIds(), currentRoleIds);
        if (user.isBuiltin() && roles.stream().noneMatch(UserApplicationService::isSuperAdmin)) {
            throw BizException.conflict("内置用户必须保留超级管理员角色");
        }
        // PUT 中省略的可选枚举字段保持原值，避免「没传 status」把已禁用的用户悄悄启用。
        final User updated = user.withProfile(
                        command.nickname().strip(),
                        user.getAvatar(),
                        command.gender() == null ? user.getGender() : Gender.of(command.gender()))
                .withAssignment(EnableStatus.ofNullable(command.status(), user.getStatus()));
        try {
            this.userRepository.updateAccount(updated);
        } catch (final DuplicateKeyException ex) {
            throw UserDuplicateErrors.from(ex, "用户账号信息已存在");
        }
        if (updated.getTokenVersion() != user.getTokenVersion()) {
            // 领域规则判定本次禁用需要吊销令牌；持久化用原子加一，不依赖读到的旧值。
            this.userRepository.revokeTokens(id);
        }
        this.userRepository.replaceRoles(id, command.roleIds());
        this.cache.evict(id);
    }

    @Override
    @Transactional
    public void updateAccountField(final long id, final UpdateUserAccountFieldCommand command) {
        this.requireUser(id);
        final String field = command.field().strip().toLowerCase(java.util.Locale.ROOT);
        final UserAccountField accountField;
        final String value = command.value().strip();
        switch (field) {
            case "username" -> {
                accountField = UserAccountField.USERNAME;
                if (!UsernamePolicy.isValid(value)) {
                    throw BizException.badRequest("value: 用户名需为 2–32 位，只能包含小写英文字母、数字和下划线");
                }
                if (this.userRepository.existsByUsername(value)) {
                    final User current = this.requireUser(id);
                    if (!current.getUsername().equalsIgnoreCase(value)) {
                        throw BizException.duplicate("用户名已存在");
                    }
                }
            }
            case "phone" -> {
                accountField = UserAccountField.PHONE;
                if (value.length() > 20) {
                    throw BizException.badRequest("value: 手机号长度不能超过 20 位");
                }
                this.ensurePhoneAvailable(Texts.trimToNull(value), id);
            }
            default -> throw BizException.badRequest("field: 仅支持 username 或 phone");
        }
        try {
            this.userRepository.updateAccountField(id, accountField, Texts.trimToNull(value));
        } catch (final DuplicateKeyException ex) {
            throw UserDuplicateErrors.from(ex, "账号信息已存在");
        }
        this.cache.evict(id);
    }

    private void ensurePhoneAvailable(final @Nullable String phone, final @Nullable Long userId) {
        if (phone != null
                && (userId == null
                        ? this.userRepository.existsByPhone(phone)
                        : this.userRepository.existsByPhone(phone, userId))) {
            throw BizException.duplicate("手机号已存在");
        }
    }

    @Override
    @Transactional
    public void delete(final long id, final long operatorId) {
        this.requireUser(id).ensureDeletableBy(operatorId);
        // 没有外键：外部身份绑定要随用户一起删，否则同一外部身份再也绑不上别人（唯一键）。
        this.identityRepository.deleteByUserId(id);
        this.userRepository.deleteById(id);
        this.cache.evict(id);
    }

    @Override
    @Transactional
    public void resetPassword(final long id, final String password) {
        this.requireUser(id);
        PasswordPolicy.validate("password", password, this.securitySettings.load());
        this.userRepository.changePassword(id, this.passwordHasher.hash(password), LocalDateTime.now(this.clock));
        this.cache.evict(id);
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserOption> options() {
        return this.userRepository.findEnabled().stream()
                .map(user -> new UserOption(user.requireId(), user.getUsername(), user.getNickname()))
                .toList();
    }

    private User requireUser(final long id) {
        return this.userRepository.findById(id).orElseThrow(() -> BizException.notFound("用户不存在"));
    }

    /**
     * 校验角色存在，且授予或移除超级管理员角色的操作人本身是超级管理员
     * （防止只有用户管理权限的人给自己或他人提权，或把超管降级）。
     *
     * @param roleIds 请求的角色
     * @param currentRoleIds 用户当前已有的角色（新建用户为空）
     * @return 请求的角色
     */
    private List<Role> ensureRolesGrantable(final Collection<Long> roleIds, final Set<Long> currentRoleIds) {
        final Set<Long> distinct = new HashSet<>(roleIds);
        final List<Role> roles = this.roleRepository.findByIds(distinct);
        if (roles.size() != distinct.size()) {
            throw BizException.badRequest("roleIds: 包含不存在的角色");
        }
        final boolean hadSuperAdmin =
                this.roleRepository.findByIds(currentRoleIds).stream().anyMatch(UserApplicationService::isSuperAdmin);
        final boolean hasSuperAdmin = roles.stream().anyMatch(UserApplicationService::isSuperAdmin);
        if (hadSuperAdmin != hasSuperAdmin
                && !CurrentUser.get().map(LoginUser::isSuperAdmin).orElse(false)) {
            throw new BizException(CommonErrors.FORBIDDEN, "只有超级管理员可以授予或移除超级管理员角色");
        }
        return roles;
    }

    private static boolean isSuperAdmin(final Role role) {
        return Authorization.SUPER_ADMIN_ROLE.equals(role.getCode());
    }

    private List<UserView> toViews(final List<User> users) {
        final List<Long> ids = users.stream().map(User::requireId).toList();
        final Map<Long, Set<Long>> roleIdsByUser = this.userRepository.findRoleIdsByUserIds(ids);
        final Set<Long> allRoleIds = roleIdsByUser.values().stream()
                .flatMap(Set::stream)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        final Map<Long, Role> roles = this.roleRepository.findByIds(allRoleIds).stream()
                .collect(Collectors.toMap(Role::requireId, Function.identity()));
        return users.stream()
                .map(user -> {
                    final List<Role> userRoles = roleIdsByUser.getOrDefault(user.requireId(), Set.of()).stream()
                            .map(roles::get)
                            .filter(Objects::nonNull)
                            .toList();
                    return new UserView(
                            user.requireId(),
                            user.getUsername(),
                            user.getNickname(),
                            user.getPhone(),
                            user.getAvatar() == null
                                    ? null
                                    : new UserAvatarView(
                                            user.getAvatar().text(),
                                            user.getAvatar().background()),
                            user.getGender().value(),
                            user.getStatus().value(),
                            user.isBuiltin(),
                            userRoles.stream().map(Role::requireId).toList(),
                            userRoles.stream().map(Role::getName).toList(),
                            user.getLastLoginAt(),
                            user.getLastLoginIp(),
                            user.getCreatedAt(),
                            user.getUpdatedAt());
                })
                .toList();
    }
}
