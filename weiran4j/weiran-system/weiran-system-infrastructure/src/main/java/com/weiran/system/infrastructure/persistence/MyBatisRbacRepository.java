package com.weiran.system.infrastructure.persistence;

import com.weiran.system.domain.port.RbacRepository;
import com.weiran.system.infrastructure.persistence.mapper.RbacMapper;
import java.util.Set;
import lombok.RequiredArgsConstructor;

/** 基于 MyBatis 的 RBAC 授权仓储实现。 */
@RequiredArgsConstructor
public class MyBatisRbacRepository implements RbacRepository {

    private final RbacMapper rbacMapper;

    @Override
    public Set<String> findRoleNamesByAccountId(final long accountId) {
        return Set.copyOf(this.rbacMapper.selectRoleNamesByAccountId(accountId));
    }

    @Override
    public Set<String> findPermissionNamesByAccountId(final long accountId) {
        return Set.copyOf(this.rbacMapper.selectPermissionNamesByAccountId(accountId));
    }
}
