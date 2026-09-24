package com.weiran.system.domain.error;

import com.kjs.wuli3.core.error.model.ErrorCode;
import com.kjs.wuli3.core.error.model.ErrorMetadata;
import com.kjs.wuli3.core.error.model.ErrorModule;
import com.kjs.wuli3.core.error.model.ErrorOrigin;
import com.kjs.wuli3.core.error.model.ErrorSeverity;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * weiran-system 模块错误码。
 *
 * <p>责任归属默认为 {@code CALLER}，wuli3 的 {@code DefaultWebErrorStatusResolver} 据此
 * 映射成 HTTP 400；{@code SERVER} 归属映射成 500。凭据错误属于调用方问题，不是服务端故障，
 * 因此这里全部保持 CALLER——归属写错会让告警噪音直接翻倍。
 */
@Getter
@RequiredArgsConstructor
@ErrorModule(
        name = "SYSTEM",
        defaultMetadata = @ErrorMetadata(origin = ErrorOrigin.CALLER, severity = ErrorSeverity.NORMAL))
public enum SystemErrors implements ErrorCode {
    /** 通行证或密码不正确。刻意不区分「账号不存在」与「密码错误」，避免账号枚举。 */
    BAD_CREDENTIALS("通行证或密码不正确"),

    /** 账号被永久禁用。 */
    ACCOUNT_DISABLED("账号已被禁用"),

    /** 账号处于限期封禁窗口内。 */
    ACCOUNT_BANNED("账号已被封禁"),

    /** 账号从未设置过密码，只能用验证码方式登录。 */
    PASSWORD_NOT_SET("该账号未设置密码，请使用验证码登录"),

    /** 令牌缺失、格式非法或签名不通过。 */
    TOKEN_INVALID("登录凭证无效，请重新登录"),

    /** 令牌已过期。 */
    TOKEN_EXPIRED("登录已过期，请重新登录"),

    /** 令牌签发后密码已变更，旧令牌一律失效。 */
    TOKEN_STALE("密码已变更，请重新登录"),

    /** 当前主体缺少所需权限。 */
    PERMISSION_DENIED("无权执行该操作"),

    /** 目标角色不存在。 */
    ROLE_NOT_FOUND("角色不存在"),

    /** 系统内置角色不允许删除。 */
    SYSTEM_ROLE_NOT_DELETABLE("系统内置角色不允许删除"),

    /** 目标封禁记录不存在。 */
    BAN_NOT_FOUND("封禁记录不存在"),

    /** 同一账号类型下用户名/手机号/邮箱已被占用。 */
    ACCOUNT_IDENTIFIER_CONFLICT("该账号标识已被占用");

    private final String message;
}
