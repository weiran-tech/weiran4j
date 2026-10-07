package com.weiran.system.api.department;

import java.util.List;
import org.jspecify.annotations.Nullable;

/** 部门管理服务。 */
public interface DepartmentService {

    /** 部门树，可按状态过滤。 */
    List<DepartmentNode> tree(@Nullable String status);

    /** 详情（children 为空）；不存在抛 40400。 */
    DepartmentNode get(long id);

    /** 新增，返回 ID。 */
    long create(SaveDepartmentCommand command);

    /** 修改；父节点不能是自己或后代（40901）。 */
    void update(long id, SaveDepartmentCommand command);

    /** 删除；有子部门或有用户时 40901。 */
    void delete(long id);
}
