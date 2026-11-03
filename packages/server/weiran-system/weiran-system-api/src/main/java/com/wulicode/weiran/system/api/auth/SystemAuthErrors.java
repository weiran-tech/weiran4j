package com.wulicode.weiran.system.api.auth;

import com.wulicode.weiran.framework.error.ErrorCode;

/** system 服务（11）的认证资源（01）错误码。 */
public enum SystemAuthErrors implements ErrorCode {
    /** 用户名不存在与密码错误使用相同码，防止枚举账号。 */
    BAD_CREDENTIALS(110101, 401, "用户名或密码错误"),
    EXTERNAL_AUTH_FAILED(110102, 401, "外部身份校验失败，请重新登录"),
    ACCOUNT_DISABLED(110103, 403, "账号已禁用"),
    ACCOUNT_NOT_PROVISIONED(110104, 403, "账号未开通，请联系管理员"),
    PASSWORD_LOGIN_DISABLED(110105, 403, "密码登录已关闭，请使用统一身份登录"),
    PHONE_NOT_FOUND(110106, 400, "手机号不存在"),
    PHONE_DISABLED(110107, 400, "手机号已禁用");

    private final int code;

    private final int httpStatus;

    private final String message;

    SystemAuthErrors(final int code, final int httpStatus, final String message) {
        this.code = code;
        this.httpStatus = httpStatus;
        this.message = message;
    }

    @Override
    public int code() {
        return this.code;
    }

    @Override
    public int httpStatus() {
        return this.httpStatus;
    }

    @Override
    public String message() {
        return this.message;
    }
}
