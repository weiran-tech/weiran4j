package com.weiran.system.domain.user;

/** 密码哈希端口（实现为 BCrypt）。 */
public interface PasswordHasher {

    /** 计算哈希。 */
    String hash(String rawPassword);

    /** 校验明文与哈希是否匹配；哈希格式非法时返回 false 而不是抛异常。 */
    boolean matches(String rawPassword, String hash);
}
