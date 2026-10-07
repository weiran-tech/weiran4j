package com.weiran.system.domain.auth;

import java.util.Optional;

/** 权限来源端口：给出已认证用户的身份信息、角色与权限码。 */
public interface PermissionSource {

    /** 用户不存在时返回空。 */
    Optional<PrincipalSnapshot> load(long userId);
}
