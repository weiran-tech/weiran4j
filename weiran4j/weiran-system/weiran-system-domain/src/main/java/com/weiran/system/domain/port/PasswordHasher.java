package com.weiran.system.domain.port;

import java.time.LocalDateTime;
import org.jspecify.annotations.Nullable;

/**
 * 密码哈希端口。
 *
 * <p>存在两套算法：weiran4j 新账号用 BCrypt，PHP 时代的历史账号是
 * {@code md5(sha1(明文 + 注册时间) + password_key)}。历史算法既无工作因子又用了已破的摘要，
 * 不能作为新账号的方案，但迁移期必须能验通，否则老用户全部登不进来。
 *
 * <p>因此校验走「先认新格式、再回落历史格式」，并由应用层在历史格式验通后立即重哈希（懒迁移）。
 */
public interface PasswordHasher {

    /** 用当前算法哈希明文密码。返回值同时包含哈希与盐值。 */
    HashedPassword hash(String rawPassword);

    /**
     * 校验明文密码。
     *
     * @param rawPassword 明文密码
     * @param storedHash 库里存的哈希
     * @param passwordKey 库里存的盐值，历史算法需要；新格式忽略
     * @param registeredAt 账号注册时间，历史算法参与摘要计算；传领域类型而不是已格式化的字符串，
     *     是因为「用哪种格式」属于历史算法的实现细节，调用方猜错格式会让所有存量账号验不通过
     * @return 校验结果，含是否需要重哈希
     */
    VerificationResult verify(
            String rawPassword, String storedHash, @Nullable String passwordKey, @Nullable LocalDateTime registeredAt);

    /**
     * 哈希结果。
     *
     * @param hash 密码哈希
     * @param passwordKey 盐值；BCrypt 自带盐，此处返回空串
     */
    record HashedPassword(String hash, String passwordKey) {}

    /**
     * 校验结果。
     *
     * @param matched 是否匹配
     * @param needsRehash 是否用历史算法验通、需要重哈希为当前算法
     */
    record VerificationResult(boolean matched, boolean needsRehash) {

        /** 校验失败。 */
        public static VerificationResult failed() {
            return new VerificationResult(false, false);
        }

        /** 用当前算法验通，无需迁移。 */
        public static VerificationResult ok() {
            return new VerificationResult(true, false);
        }

        /** 用历史算法验通，需要懒迁移。 */
        public static VerificationResult legacy() {
            return new VerificationResult(true, true);
        }
    }
}
