package com.weiran.cqt.api.entry;

/** 前台报名。 */
public interface SignupService {

    /**
     * 个人或团体报名。
     *
     * @param accountId 当前前台账号
     * @param command 报名表单
     */
    SignupResult signup(long accountId, SignupCommand command);
}
