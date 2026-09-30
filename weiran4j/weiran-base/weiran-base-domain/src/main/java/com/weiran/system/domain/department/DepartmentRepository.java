package com.weiran.system.domain.department;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

/** 部门仓储端口。部门总量小，读全量在内存里组树。 */
public interface DepartmentRepository {

    /** 按 ID 查找。 */
    Optional<Department> findById(long id);

    /** 全部部门，按 sort、id 升序。 */
    List<Department> findAll();

    /** 批量按 ID 查找。 */
    List<Department> findByIds(Collection<Long> ids);

    /** 编码是否已存在。 */
    boolean existsByCode(String code);

    /** 新增或更新，返回 ID。 */
    long save(Department department);

    /** 删除。 */
    void deleteById(long id);
}
