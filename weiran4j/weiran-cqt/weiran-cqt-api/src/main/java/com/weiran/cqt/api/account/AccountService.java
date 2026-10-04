package com.weiran.cqt.api.account;

import org.jspecify.annotations.Nullable;

/** 前台账号。 */
public interface AccountService {

    /** 手机号 + 密码 + 短信验证码登录。 */
    LoginResult login(@Nullable String phone, @Nullable String password, @Nullable String code);

    /** 手机号 + 密码登录（uniapp 注册成功后自动登录用）。 */
    LoginResult autologin(@Nullable String phone, @Nullable String password);

    /** 注册个人或学校账号。 */
    void register(RegisterCommand command);

    /** 本人资料。 */
    AccountProfileView profile(long accountId);

    /** 修改本人资料。 */
    void updateProfile(long accountId, UpdateProfileCommand command);

    /** 用短信验证码重置该手机号下全部账号的密码，旧令牌随之失效。 */
    void resetPassword(ResetPasswordCommand command);

    /** 承诺书模板链接（未配置为空串）。 */
    String commitmentTemplateUrl();
}
