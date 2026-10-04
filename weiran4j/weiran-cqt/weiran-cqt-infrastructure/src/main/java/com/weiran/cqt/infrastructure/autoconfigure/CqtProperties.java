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
     * @param mode {@code disabled}（默认，发送接口返回「短信服务未配置」）、{@code dev}（只记日志）或 {@code aliyun}（阿里云短信）
     * @param exposeCode 开发模式下是否把验证码回显在发送接口的响应里，默认 false
     * @param ipHourlyLimit 同一客户端 IP 每小时最多成功发送的条数，默认 10，0 表示不限
     * @param aliyun 阿里云短信（{@code mode=aliyun} 时生效）
     */
    public record Sms(
            @DefaultValue("disabled") String mode,
            @DefaultValue("false") boolean exposeCode,
            @DefaultValue("10") int ipHourlyLimit,
            @DefaultValue Aliyun aliyun) {}

    /**
     * 阿里云短信。AccessKey 只走环境变量；{@code mode=aliyun} 时前四项缺一项即启动失败。
     *
     * @param accessKeyId AccessKey ID（{@code WEIRAN_CQT_SMS_ALIYUN_ACCESS_KEY_ID}）
     * @param accessKeySecret AccessKey Secret（{@code WEIRAN_CQT_SMS_ALIYUN_ACCESS_KEY_SECRET}），不得进日志
     * @param signName 短信签名名称（{@code WEIRAN_CQT_SMS_ALIYUN_SIGN_NAME}）
     * @param templateCode 验证码模板 CODE（{@code WEIRAN_CQT_SMS_ALIYUN_TEMPLATE_CODE}）
     * @param templateParamName 模板里验证码的变量名，默认 {@code code}
     * @param endpoint 接入点，默认 {@code dysmsapi.aliyuncs.com}
     * @param connectTimeout 连接超时，默认 3 秒
     * @param readTimeout 读取超时，默认 5 秒
     */
    public record Aliyun(
            @DefaultValue("") String accessKeyId,
            @DefaultValue("") String accessKeySecret,
            @DefaultValue("") String signName,
            @DefaultValue("") String templateCode,
            @DefaultValue("code") String templateParamName,
            @DefaultValue("dysmsapi.aliyuncs.com") String endpoint,
            @DefaultValue("3s") Duration connectTimeout,
            @DefaultValue("5s") Duration readTimeout) {}
}
