package com.weiran.system.domain.auth;

import java.util.Optional;

/**
 * 身份解析端口：把校验过的令牌映射为本地用户 ID，并判定令牌是否已被吊销。
 *
 * <p>本地令牌的吊销判定必须每次读库，不得经过跨请求缓存（宪法 CP-8）。
 */
public interface IdentityResolver {

    /** 令牌对应的本地用户仍存在、启用且未被吊销时返回其 ID，否则为空。 */
    Optional<Long> resolve(VerifiedToken token);
}
