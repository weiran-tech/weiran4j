package com.weiran.cqt.domain.account;

/** 密码哈希端口（实现只允许 BCrypt，宪法 CP-8）。 */
public interface PasswordHasher {

    /** 计算哈希。 */
    String hash(String rawPassword);

    /** 校验明文与哈希是否匹配；哈希格式非法时返回 false。 */
    boolean matches(String rawPassword, String hash);
}
