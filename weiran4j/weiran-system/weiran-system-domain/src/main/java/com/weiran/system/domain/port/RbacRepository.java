package com.weiran.system.domain.port;

import java.util.Set;

/** RBAC 授权数据仓储端口。 */
public interface RbacRepository {

    /** 取账号直接持有的角色标识集合。 */
    Set<String> findRoleNamesByAccountId(long accountId);

    /**
     * 取账号经由角色获得的权限标识集合。
     *
     * <p>实现必须一次查完（join 到底），不要按角色循环查——账号挂多个角色是常态。
     */
    Set<String> findPermissionNamesByAccountId(long accountId);
}
