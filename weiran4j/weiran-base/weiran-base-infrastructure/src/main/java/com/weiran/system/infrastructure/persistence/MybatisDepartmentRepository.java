package com.weiran.system.infrastructure.persistence;

import com.baomidou.mybatisplus.core.toolkit.Wrappers;
import com.weiran.common.status.EnableStatus;
import com.weiran.system.domain.department.Department;
import com.weiran.system.domain.department.DepartmentRepository;
import com.weiran.system.infrastructure.persistence.entity.SysDepartmentDO;
import com.weiran.system.infrastructure.persistence.mapper.SysDepartmentMapper;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

/** {@link DepartmentRepository} 的 MyBatis-Plus 实现。 */
public class MybatisDepartmentRepository implements DepartmentRepository {

    private final SysDepartmentMapper departmentMapper;

    /** 构造仓储。 */
    public MybatisDepartmentRepository(final SysDepartmentMapper departmentMapper) {
        this.departmentMapper = departmentMapper;
    }

    @Override
    public Optional<Department> findById(final long id) {
        return Optional.ofNullable(this.departmentMapper.selectById(id)).map(MybatisDepartmentRepository::toDomain);
    }

    @Override
    public List<Department> findAll() {
        return this.departmentMapper
                .selectList(Wrappers.lambdaQuery(SysDepartmentDO.class)
                        .orderByAsc(SysDepartmentDO::getSort)
                        .orderByAsc(SysDepartmentDO::getId))
                .stream()
                .map(MybatisDepartmentRepository::toDomain)
                .toList();
    }

    @Override
    public List<Department> findByIds(final Collection<Long> ids) {
        if (ids.isEmpty()) {
            return List.of();
        }
        return this.departmentMapper.selectByIds(ids).stream()
                .map(MybatisDepartmentRepository::toDomain)
                .toList();
    }

    @Override
    public boolean existsByCode(final String code) {
        return this.departmentMapper.exists(
                Wrappers.lambdaQuery(SysDepartmentDO.class).eq(SysDepartmentDO::getCode, code));
    }

    @Override
    public long save(final Department department) {
        final SysDepartmentDO row = MybatisDepartmentRepository.toDataObject(department);
        if (row.getId() == null) {
            this.departmentMapper.insert(row);
        } else {
            this.departmentMapper.updateById(row);
        }
        return row.getId();
    }

    @Override
    public void deleteById(final long id) {
        this.departmentMapper.deleteById(id);
    }

    private static Department toDomain(final SysDepartmentDO row) {
        return Department.builder()
                .id(row.getId())
                .parentId(row.getParentId() == null ? 0L : row.getParentId())
                .name(row.getName())
                .code(row.getCode())
                .leaderId(row.getLeaderId())
                .phone(row.getPhone())
                .sort(row.getSort() == null ? 0 : row.getSort())
                .status(EnableStatus.of(row.getStatus()))
                .createdAt(row.getCreatedAt())
                .updatedAt(row.getUpdatedAt())
                .build();
    }

    private static SysDepartmentDO toDataObject(final Department department) {
        final SysDepartmentDO row = new SysDepartmentDO();
        row.setId(department.getId());
        row.setParentId(department.getParentId());
        row.setName(department.getName());
        row.setCode(department.getCode());
        row.setLeaderId(department.getLeaderId());
        row.setPhone(department.getPhone());
        row.setSort(department.getSort());
        row.setStatus(department.getStatus().value());
        return row;
    }
}
