package com.wulicode.weiran.system.domain.auth;

/** 密码校验前的共享原子准入；返回前计数必须独立提交。 */
public interface PasswordAttempts {
    /** 登录的账号与可信 IP 双额度。 */
    void reserveLogin(String username, String ip);
    /** 当前用户的锁屏额度。 */
    void reserveUnlock(long userId);
}
