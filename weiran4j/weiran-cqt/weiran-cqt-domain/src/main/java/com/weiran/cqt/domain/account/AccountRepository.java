package com.weiran.cqt.domain.account;

import java.util.Optional;
import java.util.OptionalInt;
import org.jspecify.annotations.Nullable;

/** 前台账号仓储端口。 */
public interface AccountRepository {

    /** 按手机号取一个账号：旧数据可能重复，取来源 {@code zhongxi} 优先、其次 ID 最小的一条。 */
    Optional<Account> findFirstByPhone(String phone);

    /** 是否已有账号使用该手机号。 */
    boolean existsByPhone(String phone);

    /**
     * 是否已有个人账号使用该证件。
     *
     * @param type 证件类型
     * @param credential 规范化后的证件号
     * @param excludeId 排除的账号 ID（改资料时排除自己）
     */
    boolean existsPersonalCredential(CredentialType type, String credential, @Nullable Long excludeId);

    /** 来源库内下一个用户编号（现有最大值 + 1）。 */
    long nextLegacyUserId(String sourceDatabase);

    /** 插入新账号，返回 ID。 */
    long insert(Account account);

    /** 按 ID 读取。 */
    Optional<Account> findById(long id);

    /** 保存资料；不写密码哈希与令牌版本（二者只由重置密码修改，避免并发时把版本写回旧值）。 */
    void updateProfile(Account account);

    /**
     * 重置该手机号下全部账号的密码，并把令牌版本加 1。
     *
     * @return 影响的账号数
     */
    int resetPasswordByPhone(String phone, String passwordHash);

    /** 账号当前的令牌版本；账号不存在时为空。 */
    OptionalInt findTokenVersion(long id);
}
