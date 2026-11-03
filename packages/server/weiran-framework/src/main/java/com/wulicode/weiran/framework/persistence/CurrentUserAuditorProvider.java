package com.wulicode.weiran.framework.persistence;

import com.wulicode.weiran.framework.auth.CurrentUser;
import com.wulicode.weiran.framework.auth.LoginUser;
import java.util.Optional;

/** 默认审计人来源：当前登录用户。 */
public class CurrentUserAuditorProvider implements AuditorProvider {

    @Override
    public Optional<Long> currentAuditor() {
        return CurrentUser.get().map(LoginUser::id);
    }
}
