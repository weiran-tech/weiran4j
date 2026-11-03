package com.wulicode.weiran.system.domain.user;

/** 全局安全设置仓储。 */
public interface SecuritySettingsRepository {

    SecuritySettings load();

    /** 按 revision 条件更新，冲突时返回 false。 */
    boolean save(SecuritySettings settings);
}
