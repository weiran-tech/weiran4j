package com.weiran.system.domain.port;

import com.weiran.common.page.PageQuery;
import com.weiran.common.page.PageResult;
import com.weiran.system.domain.account.Account;
import com.weiran.system.domain.account.AccountType;
import java.time.LocalDateTime;
import java.util.Optional;
import org.jspecify.annotations.Nullable;

/** 账号仓储端口。 */
public interface AccountRepository {

    /**
     * 按通行证与账号类型查账号。
     *
     * <p>通行证可能是用户名、手机号或邮箱，由实现按 {@code PassportType} 决定查哪一列。
     * 带上账号类型是为了隔离前台与后台账号空间——同一个手机号在两个空间里是两个账号。
     */
    Optional<Account> findByPassport(String passport, AccountType type);

    /** 按账号 ID 查账号。 */
    Optional<Account> findById(long accountId);

    /** 记录一次成功登录：累加登录次数、更新登录时间与来源 IP。 */
    void recordLogin(long accountId, LocalDateTime loginedAt, String loginIp);

    /** 更新密码哈希与盐值，用于改密与历史哈希的懒迁移。 */
    void updatePassword(long accountId, String passwordHash, String passwordKey);

    /**
     * 分页查询账号列表，支持用户名/手机号/邮箱模糊匹配与账号类型精确筛选。
     *
     * <p>管理端用例，与 {@link #findByPassport} 服务的登录鉴权场景不同——
     * 这里允许模糊匹配、允许跨账号类型分页浏览。
     */
    PageResult<Account> list(PageQuery page, @Nullable String keyword, @Nullable AccountType accountType);

    /**
     * 新增账号，返回落库后的账号（含生成的 ID）。
     *
     * <p>{@code passwordHash}/{@code passwordKey} 必须是调用方已通过
     * {@link PasswordHasher#hash} 产出的 BCrypt 哈希，本方法只负责持久化，不做哈希计算。
     */
    Account insert(Account account);

    /** 判断同一账号类型下用户名/手机号/邮箱是否已被占用。 */
    boolean existsByIdentifier(String username, @Nullable String mobile, @Nullable String email, AccountType type);

    /** 设置账号启用状态。 */
    void setEnabled(long accountId, boolean enabled);

    /** 更新账号的可变资料字段（手机号、邮箱），不含密码与启禁用状态。 */
    void updateProfile(long accountId, @Nullable String mobile, @Nullable String email);
}
