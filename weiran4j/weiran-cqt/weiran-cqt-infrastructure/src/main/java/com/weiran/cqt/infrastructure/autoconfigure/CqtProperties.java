package com.weiran.cqt.infrastructure.autoconfigure;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * {@code weiran.cqt.*}：常青藤业务配置（默认值见 {@code application-biz.yml}；密钥只走环境变量）。
 *
 * @param jwt 前台令牌
 * @param sms 短信验证码
 * @param bcryptStrength 前台账号密码的 BCrypt 强度，默认 10；测试可调低以加速
 */
@ConfigurationProperties("weiran.cqt")
public record CqtProperties(
        @DefaultValue Jwt jwt,
        @DefaultValue Sms sms,
        @DefaultValue("10") int bcryptStrength) {

    /**
     * 前台令牌。
     *
     * @param secret HS256 密钥，至少 32 字节；生产由环境变量 {@code WEIRAN_CQT_JWT_SECRET} 注入
     * @param ttl 有效期，默认 7 天
     */
    public record Jwt(
            @DefaultValue("") String secret,
            @DefaultValue("7d") Duration ttl) {}

    /**
     * 短信验证码。
     *
     * @param mode {@code disabled}（默认，发送接口返回「短信服务未配置」）或 {@code dev}（只记日志）；接入真实服务商后新增取值
     * @param exposeCode 开发模式下是否把验证码回显在发送接口的响应里，默认 false
     */
    public record Sms(
            @DefaultValue("disabled") String mode,
            @DefaultValue("false") boolean exposeCode) {}
}
