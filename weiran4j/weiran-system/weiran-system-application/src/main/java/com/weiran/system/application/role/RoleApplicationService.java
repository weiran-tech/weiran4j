package com.weiran.system.application.role;

import com.weiran.common.error.BizException;
import com.weiran.common.page.PageQuery;
import com.weiran.common.page.PageResult;
import com.weiran.common.status.EnableStatus;
import com.weiran.common.text.Texts;
import com.weiran.system.api.role.RoleDetailView;
import com.weiran.system.api.role.RoleOption;
import com.weiran.system.api.role.RoleQuery;
import com.weiran.system.api.role.RoleService;
import com.weiran.system.api.role.RoleView;
import com.weiran.system.api.role.SaveRoleCommand;
import com.weiran.system.application.auth.AuthSnapshotCache;
import com.weiran.system.domain.menu.Menu;
import com.weiran.system.domain.menu.MenuRepository;
import com.weiran.system.domain.role.Role;
import com.weiran.system.domain.role.RoleCriteria;
import com.weiran.system.domain.role.RoleRepository;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.transaction.annotation.Transactional;

/** 角色管理用例。角色与授权变化都会让全部授权快照失效。 */
public class RoleApplicationService implements RoleService {

    private final RoleRepository roleRepository;

    private final MenuRepository menuRepository;

    private final AuthSnapshotCache cache;

    /** 构造服务。 */
    public RoleApplicationService(
            final RoleRepository roleRepository, final MenuRepository menuRepository, final AuthSnapshotCache cache) {
        this.roleRepository = roleRepository;
        this.menuRepository = menuRepository;
        this.cache = cache;
    }

    @Override
    @Transactional(readOnly = true)
    public PageResult<RoleView> page(final RoleQuery query, final PageQuery pageQuery) {
        final RoleCriteria criteria =
                new RoleCriteria(Texts.trimToNull(query.keyword()), EnableStatus.filterOf(query.status()));
        final PageResult<Role> page = this.roleRepository.page(criteria, pageQuery);
        final Map<Long, Long> counts = this.roleRepository.countUsersByRoleIds(
                page.list().stream().map(Role::requireId).toList());
        return page.map(role -> RoleApplicationService.toView(role, counts.getOrDefault(role.requireId(), 0L)));
    }

    @Override
    @Transactional(readOnly = true)
    public List<RoleOption> options() {
        return this.roleRepository.findEnabled().stream()
                .map(role -> new RoleOption(role.requireId(), role.getName(), role.getCode()))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public RoleDetailView get(final long id) {
        final Role role = this.requireRole(id);
        final RoleView view = RoleApplicationService.toView(role, this.roleRepository.countUsers(id));
        return RoleDetailView.of(
                view, this.roleRepository.findMenuIds(id).stream().sorted().toList());
    }

    @Override
    @Transactional
    public long create(final SaveRoleCommand command) {
        final String code = command.code().strip();
        Role.validateCode(code);
        if (this.roleRepository.existsByCode(code)) {
            throw BizException.duplicate("角色编码已存在");
        }
        final Role role = Role.builder()
                .name(command.name().strip())
                .code(code)
                .description(Texts.trimToNull(command.description()))
                .sort(command.sort() == null ? 0 : command.sort())
                .status(EnableStatus.ofNullable(command.status(), EnableStatus.ENABLED))
                .builtin(false)
                .build();
        return this.roleRepository.save(role);
    }

    @Override
    @Transactional
    public void update(final long id, final SaveRoleCommand command) {
        final Role role = this.requireRole(id);
        final String code = command.code().strip();
        final Role updated = role.withDetails(
                command.name().strip(),
                code,
                Texts.trimToNull(command.description()),
                command.sort() == null ? role.getSort() : command.sort(),
                EnableStatus.ofNullable(command.status(), role.getStatus()));
        if (!role.getCode().equals(code) && this.roleRepository.existsByCode(code)) {
            throw BizException.duplicate("角色编码已存在");
        }
        this.roleRepository.save(updated);
        this.cache.evictAll();
    }

    @Override
    @Transactional
    public void delete(final long id) {
        this.requireRole(id).ensureDeletable(this.roleRepository.countUsers(id));
        this.roleRepository.deleteById(id);
        this.cache.evictAll();
    }

    @Override
    @Transactional
    public void assignMenus(final long id, final List<Long> menuIds) {
        this.requireRole(id);
        final Set<Long> existing =
                this.menuRepository.findAll().stream().map(Menu::requireId).collect(Collectors.toSet());
        final Set<Long> requested = new HashSet<>(menuIds);
        if (!existing.containsAll(requested)) {
            throw BizException.badRequest("menuIds: 包含不存在的菜单");
        }
        this.roleRepository.replaceMenus(id, requested.stream().sorted().toList());
        this.cache.evictAll();
    }

    private Role requireRole(final long id) {
        return this.roleRepository.findById(id).orElseThrow(() -> BizException.notFound("角色不存在"));
    }

    private static RoleView toView(final Role role, final long userCount) {
        return new RoleView(
                role.requireId(),
                role.getName(),
                role.getCode(),
                role.getDescription(),
                role.getSort(),
                role.getStatus().value(),
                role.isBuiltin(),
                userCount,
                role.getCreatedAt(),
                role.getUpdatedAt());
    }
}
