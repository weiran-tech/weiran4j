package com.weiran.system.application.department;

import com.weiran.common.error.BizException;
import com.weiran.common.status.EnableStatus;
import com.weiran.common.text.Texts;
import com.weiran.common.tree.Trees;
import com.weiran.system.api.department.DepartmentNode;
import com.weiran.system.api.department.DepartmentService;
import com.weiran.system.api.department.SaveDepartmentCommand;
import com.weiran.system.domain.department.Department;
import com.weiran.system.domain.department.DepartmentRepository;
import com.weiran.system.domain.hierarchy.Hierarchy;
import com.weiran.system.domain.user.User;
import com.weiran.system.domain.user.UserRepository;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
import org.jspecify.annotations.Nullable;
import org.springframework.transaction.annotation.Transactional;

/** 部门管理用例。 */
public class DepartmentApplicationService implements DepartmentService {

    private static final Comparator<Department> ORDER =
            Comparator.comparingInt(Department::getSort).thenComparingLong(Department::requireId);

    private final DepartmentRepository departmentRepository;

    private final UserRepository userRepository;

    /** 构造服务。 */
    public DepartmentApplicationService(
            final DepartmentRepository departmentRepository, final UserRepository userRepository) {
        this.departmentRepository = departmentRepository;
        this.userRepository = userRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<DepartmentNode> tree(final @Nullable String status) {
        final EnableStatus filter = EnableStatus.filterOf(status);
        final List<Department> all = this.departmentRepository.findAll();
        final List<Department> departments =
                filter == null ? all : DepartmentApplicationService.matchingWithAncestors(all, filter);
        final Map<Long, String> leaderNames = this.leaderNames(departments);
        return Trees.build(
                departments,
                Department::requireId,
                Department::getParentId,
                DepartmentApplicationService.ORDER,
                (dept, children) -> DepartmentApplicationService.toNode(dept, leaderNames, children));
    }

    @Override
    @Transactional(readOnly = true)
    public DepartmentNode get(final long id) {
        final Department department = this.requireDepartment(id);
        return DepartmentApplicationService.toNode(department, this.leaderNames(List.of(department)), List.of());
    }

    @Override
    @Transactional
    public long create(final SaveDepartmentCommand command) {
        final String code = command.code().strip();
        if (this.departmentRepository.existsByCode(code)) {
            throw BizException.duplicate("部门编码已存在");
        }
        if (command.parentId() != Hierarchy.ROOT
                && this.departmentRepository.findById(command.parentId()).isEmpty()) {
            throw BizException.badRequest("parentId: 上级部门不存在");
        }
        this.ensureLeaderExists(command.leaderId());
        return this.departmentRepository.save(
                DepartmentApplicationService.apply(Department.builder(), command, code, null)
                        .build());
    }

    @Override
    @Transactional
    public void update(final long id, final SaveDepartmentCommand command) {
        final Department existing = this.requireDepartment(id);
        this.hierarchy().ensureValidParent(id, command.parentId(), "部门");
        final String code = command.code().strip();
        if (!existing.getCode().equals(code) && this.departmentRepository.existsByCode(code)) {
            throw BizException.duplicate("部门编码已存在");
        }
        this.ensureLeaderExists(command.leaderId());
        this.departmentRepository.save(DepartmentApplicationService.apply(existing.toBuilder(), command, code, existing)
                .build());
    }

    @Override
    @Transactional
    public void delete(final long id) {
        this.requireDepartment(id);
        Department.ensureDeletable(this.hierarchy().hasChildren(id), this.userRepository.countByDepartmentId(id));
        this.departmentRepository.deleteById(id);
    }

    /** 自身及全部祖先都满足状态过滤的部门（被过滤掉的部门，其下级不会被提升成根节点）。 */
    private static List<Department> matchingWithAncestors(final List<Department> all, final EnableStatus filter) {
        final Map<Long, Department> byId = new HashMap<>();
        all.forEach(dept -> byId.put(dept.requireId(), dept));
        return all.stream()
                .filter(dept -> {
                    Department current = dept;
                    final Set<Long> visited = new HashSet<>();
                    while (current != null && visited.add(current.requireId())) {
                        if (current.getStatus() != filter) {
                            return false;
                        }
                        current = byId.get(current.getParentId());
                    }
                    return true;
                })
                .toList();
    }

    private Department requireDepartment(final long id) {
        return this.departmentRepository.findById(id).orElseThrow(() -> BizException.notFound("部门不存在"));
    }

    private void ensureLeaderExists(final @Nullable Long leaderId) {
        if (leaderId != null && this.userRepository.findById(leaderId).isEmpty()) {
            throw BizException.badRequest("leaderId: 负责人不存在");
        }
    }

    private Hierarchy hierarchy() {
        final Map<Long, Long> parentById = new HashMap<>();
        this.departmentRepository.findAll().forEach(dept -> parentById.put(dept.requireId(), dept.getParentId()));
        return Hierarchy.of(parentById);
    }

    private Map<Long, String> leaderNames(final List<Department> departments) {
        final Set<Long> leaderIds = departments.stream()
                .map(Department::getLeaderId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        return this.userRepository.findByIds(leaderIds).stream()
                .collect(Collectors.toMap(User::requireId, User::getNickname));
    }

    private static Department.DepartmentBuilder apply(
            final Department.DepartmentBuilder builder,
            final SaveDepartmentCommand command,
            final String code,
            final @Nullable Department base) {
        return builder.parentId(command.parentId())
                .name(command.name().strip())
                .code(code)
                .leaderId(command.leaderId())
                .phone(Texts.trimToNull(command.phone()))
                .sort(command.sort() != null ? command.sort() : base == null ? 0 : base.getSort())
                .status(EnableStatus.ofNullable(
                        command.status(), base == null ? EnableStatus.ENABLED : base.getStatus()));
    }

    private static DepartmentNode toNode(
            final Department department, final Map<Long, String> leaderNames, final List<DepartmentNode> children) {
        final Long leaderId = department.getLeaderId();
        return new DepartmentNode(
                department.requireId(),
                department.getParentId(),
                department.getName(),
                department.getCode(),
                leaderId,
                leaderId == null ? null : leaderNames.get(leaderId),
                department.getPhone(),
                department.getSort(),
                department.getStatus().value(),
                department.getCreatedAt(),
                children);
    }
}
