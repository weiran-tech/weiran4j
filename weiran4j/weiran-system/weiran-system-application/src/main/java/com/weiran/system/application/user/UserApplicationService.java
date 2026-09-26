package com.weiran.system.application.user;

import com.weiran.common.error.BizException;
import com.weiran.common.error.CommonErrors;
import com.weiran.common.page.PageQuery;
import com.weiran.common.page.PageResult;
import com.weiran.common.status.EnableStatus;
import com.weiran.common.text.Texts;
import com.weiran.framework.auth.CurrentUser;
import com.weiran.framework.auth.LoginUser;
import com.weiran.system.api.user.CreateUserCommand;
import com.weiran.system.api.user.UpdateUserCommand;
import com.weiran.system.api.user.UserOption;
import com.weiran.system.api.user.UserQuery;
import com.weiran.system.api.user.UserService;
import com.weiran.system.api.user.UserView;
import com.weiran.system.application.auth.AuthSnapshotCache;
import com.weiran.system.domain.auth.Authorization;
import com.weiran.system.domain.department.Department;
import com.weiran.system.domain.department.DepartmentRepository;
import com.weiran.system.domain.hierarchy.Hierarchy;
import com.weiran.system.domain.role.Role;
import com.weiran.system.domain.role.RoleRepository;
import com.weiran.system.domain.user.Gender;
import com.weiran.system.domain.user.PasswordHasher;
import com.weiran.system.domain.user.PasswordPolicy;
import com.weiran.system.domain.user.User;
import com.weiran.system.domain.user.UserCriteria;
import com.weiran.system.domain.user.UserRepository;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.jspecify.annotations.Nullable;
import org.springframework.transaction.annotation.Transactional;

/** 用户管理用例。 */
public class UserApplicationService implements UserService {

    private final UserRepository userRepository;

    private final RoleRepository roleRepository;

    private final DepartmentRepository departmentRepository;

    private final PasswordHasher passwordHasher;

    private final AuthSnapshotCache cache;

    private final Clock clock;

    /** 构造服务。 */
    public UserApplicationService(
            final UserRepository userRepository,
            final RoleRepository roleRepository,
            final DepartmentRepository departmentRepository,
            final PasswordHasher passwordHasher,
            final AuthSnapshotCache cache,
            final Clock clock) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.departmentRepository = departmentRepository;
        this.passwordHasher = passwordHasher;
        this.cache = cache;
        this.clock = clock;
    }

    @Override
    @Transactional(readOnly = true)
    public PageResult<UserView> page(final UserQuery query, final PageQuery pageQuery) {
        final Long departmentId = query.departmentId();
        final Set<Long> departmentIds = departmentId == null ? null : this.departmentScope(departmentId);
        final UserCriteria criteria = new UserCriteria(
                Texts.trimToNull(query.keyword()), EnableStatus.filterOf(query.status()), departmentIds);
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
        if (this.userRepository.existsByUsername(username)) {
            throw BizException.duplicate("用户名已存在");
        }
        PasswordPolicy.validate("password", command.password());
        this.ensureDepartmentExists(command.departmentId());
        this.ensureRolesGrantable(command.roleIds(), Set.of());
        final LocalDateTime now = LocalDateTime.now(this.clock);
        final User user = User.builder()
                .username(username)
                .nickname(command.nickname().strip())
                .passwordHash(this.passwordHasher.hash(command.password()))
                .email(Texts.trimToNull(command.email()))
                .phone(Texts.trimToNull(command.phone()))
                .gender(Gender.of(command.gender()))
                .departmentId(command.departmentId())
                .status(EnableStatus.ofNullable(command.status(), EnableStatus.ENABLED))
                .tokenVersion(0)
                .passwordUpdatedAt(now)
                .builtin(false)
                .build();
        final long id = this.userRepository.insert(user);
        this.userRepository.replaceRoles(id, command.roleIds());
        return id;
    }

    @Override
    @Transactional
    public void update(final long id, final UpdateUserCommand command) {
        final User user = this.requireUser(id);
        this.ensureDepartmentExists(command.departmentId());
        final Set<Long> currentRoleIds = this.userRepository.findRoleIds(id);
        final List<Role> roles = this.ensureRolesGrantable(command.roleIds(), currentRoleIds);
        if (user.isBuiltin() && roles.stream().noneMatch(UserApplicationService::isSuperAdmin)) {
            throw BizException.conflict("内置用户必须保留超级管理员角色");
        }
        // PUT 中省略的可选枚举字段保持原值，避免「没传 status」把已禁用的用户悄悄启用。
        final User updated = user.withProfile(
                        command.nickname().strip(),
                        Texts.trimToNull(command.email()),
                        Texts.trimToNull(command.phone()),
                        user.getAvatar(),
                        command.gender() == null ? user.getGender() : Gender.of(command.gender()))
                .withAssignment(command.departmentId(), EnableStatus.ofNullable(command.status(), user.getStatus()));
        this.userRepository.updateAccount(updated);
        if (updated.getTokenVersion() != user.getTokenVersion()) {
            // 领域规则判定本次禁用需要吊销令牌；持久化用原子加一，不依赖读到的旧值。
            this.userRepository.revokeTokens(id);
        }
        this.userRepository.replaceRoles(id, command.roleIds());
        this.cache.evict(id);
    }

    @Override
    @Transactional
    public void delete(final long id, final long operatorId) {
        this.requireUser(id).ensureDeletableBy(operatorId);
        this.userRepository.deleteById(id);
        this.cache.evict(id);
    }

    @Override
    @Transactional
    public void resetPassword(final long id, final String password) {
        this.requireUser(id);
        PasswordPolicy.validate("password", password);
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

    private Set<Long> departmentScope(final long departmentId) {
        final Map<Long, Long> parentById = new HashMap<>();
        this.departmentRepository.findAll().forEach(dept -> parentById.put(dept.requireId(), dept.getParentId()));
        return Hierarchy.of(parentById).selfAndDescendantsOf(departmentId);
    }

    private void ensureDepartmentExists(final @Nullable Long departmentId) {
        if (departmentId != null
                && this.departmentRepository.findById(departmentId).isEmpty()) {
            throw BizException.badRequest("departmentId: 部门不存在");
        }
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
        final Set<Long> departmentIds = users.stream()
                .map(User::getDepartmentId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        final Map<Long, String> departmentNames = this.departmentRepository.findByIds(departmentIds).stream()
                .collect(Collectors.toMap(Department::requireId, Department::getName));
        return users.stream()
                .map(user -> {
                    final List<Role> userRoles = roleIdsByUser.getOrDefault(user.requireId(), Set.of()).stream()
                            .map(roles::get)
                            .filter(Objects::nonNull)
                            .toList();
                    final Long departmentId = user.getDepartmentId();
                    return new UserView(
                            user.requireId(),
                            user.getUsername(),
                            user.getNickname(),
                            user.getEmail(),
                            user.getPhone(),
                            user.getAvatar(),
                            user.getGender().value(),
                            departmentId,
                            departmentId == null ? null : departmentNames.get(departmentId),
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
