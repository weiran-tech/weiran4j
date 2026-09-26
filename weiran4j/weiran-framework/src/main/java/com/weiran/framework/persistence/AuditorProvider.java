package com.weiran.framework.persistence;

import java.util.Optional;

/**
 * 审计人来源 SPI：给 MyBatis-Plus 自动填充 {@code created_by / updated_by}。
 *
 * <p>默认实现 {@link CurrentUserAuditorProvider} 从当前登录用户取；后台任务等无登录上下文的场景返回空，列留 null。
 */
public interface AuditorProvider {

    /** 当前审计人 ID。 */
    Optional<Long> currentAuditor();
}
