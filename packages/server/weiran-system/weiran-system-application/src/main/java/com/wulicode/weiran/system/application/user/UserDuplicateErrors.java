package com.wulicode.weiran.system.application.user;

import com.wulicode.weiran.framework.error.BizException;
import java.util.Locale;
import org.springframework.dao.DuplicateKeyException;

/** 将 sys_user 唯一键冲突统一转换为可读的重复项错误。 */
public final class UserDuplicateErrors {

    private UserDuplicateErrors() {}

    /** 从 MySQL 唯一键冲突中选择字段级重复提示。 */
    public static BizException from(final DuplicateKeyException exception, final String fallbackMessage) {
        final String details = exception.toString().toLowerCase(Locale.ROOT);
        if (details.contains("uk_sys_user_username")) {
            return BizException.duplicate("用户名已存在");
        }
        if (details.contains("uk_sys_user_phone")) {
            return BizException.duplicate("手机号已存在");
        }
        return BizException.duplicate(fallbackMessage);
    }
}
