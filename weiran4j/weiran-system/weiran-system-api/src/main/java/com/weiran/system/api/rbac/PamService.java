package com.weiran.system.api.rbac;

import com.weiran.common.page.PageResult;

/**
 * 账号管理对外服务。
 *
 * <p>与登录鉴权（{@link com.weiran.system.api.auth.AuthService}）共享同一份账号数据，
 * 但服务不同场景：鉴权关心"能不能登录"，本服务关心"管理员如何维护账号"。
 */
public interface PamService {

    /** 分页查询账号列表，支持关键字模糊匹配与账号类型筛选。 */
    PageResult<AccountView> list(AccountQuery query);

    /** 查账号详情。 */
    AccountView findById(long accountId);

    /** 新增账号，密码经 {@code PasswordHasher} 产出 BCrypt 哈希后落库。 */
    AccountView create(CreateAccountCommand command);

    /** 编辑账号可变资料字段（不含密码）。 */
    AccountView update(long accountId, UpdateAccountCommand command);

    /** 启用账号。 */
    void enable(long accountId);

    /** 禁用账号，禁用后现有登录接口拒绝该账号登录。 */
    void disable(long accountId);

    /** 重置密码，复用 {@code PasswordHasher.hash()} 产出 BCrypt 哈希，与交互式重置工具语义一致。 */
    void resetPassword(long accountId, String newPassword);

    /**
     * 查登录日志（复用 {@code pam_account.logined_at}/{@code login_ip}，非独立流水表，
     * 因此结果至多一条；返回 {@code PageResult} 是为了与其它列表接口保持统一的响应形状）。
     */
    PageResult<LoginLogView> loginLogs(long accountId);
}
