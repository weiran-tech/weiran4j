package com.wulicode.weiran.system.domain.auth;

/** 本地 RBAC 的共享授权修订号。 */
public interface AuthorizationRevision {
    /** 从共享存储读取当前一致性视图的修订号，失败不得沿用旧授权。 */
    long current();
    /** 在当前业务事务内原子推进，回滚不发布。 */
    void advance();
}
