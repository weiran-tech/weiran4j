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
 * @param storage 文件存储
 */
@ConfigurationProperties("weiran.cqt")
public record CqtProperties(
        @DefaultValue Jwt jwt,
        @DefaultValue Sms sms,
        @DefaultValue("10") int bcryptStrength,
        @DefaultValue Storage storage) {

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

    /**
     * 文件存储。
     *
     * @param mode {@code disabled}（默认，上传返回「文件存储未配置」）、{@code oss}（阿里云 OSS）或 {@code local}（本地目录，仅开发 / 测试）
     * @param keyPrefix 对象名前缀，默认 {@code cqt/}
     * @param oss 阿里云 OSS（{@code mode=oss} 时生效）
     * @param local 本地目录（{@code mode=local} 时生效）
     */
    public record Storage(
            @DefaultValue("disabled") String mode,
            @DefaultValue("cqt/") String keyPrefix,
            @DefaultValue Oss oss,
            @DefaultValue Local local) {}

    /**
     * 阿里云 OSS。AccessKey 只走环境变量；{@code mode=oss} 时五项缺一即启动失败。
     *
     * @param accessKeyId AccessKey ID（{@code WEIRAN_CQT_OSS_ACCESS_KEY_ID}）
     * @param accessKeySecret AccessKey Secret（{@code WEIRAN_CQT_OSS_ACCESS_KEY_SECRET}），不得进日志
     * @param bucket Bucket 名（{@code WEIRAN_CQT_OSS_BUCKET}），须为公共读
     * @param endpoint 地域接入点，如 {@code oss-cn-beijing.aliyuncs.com}（{@code WEIRAN_CQT_OSS_ENDPOINT}）
     * @param publicBaseUrl 公网访问前缀，如 {@code https://bucket.oss-cn-beijing.aliyuncs.com} 或自定义域名（{@code WEIRAN_CQT_OSS_PUBLIC_BASE_URL}）
     */
    public record Oss(
            @DefaultValue("") String accessKeyId,
            @DefaultValue("") String accessKeySecret,
            @DefaultValue("") String bucket,
            @DefaultValue("") String endpoint,
            @DefaultValue("") String publicBaseUrl) {}

    /**
     * 本地目录（仅开发 / 测试）。
     *
     * @param root 根目录（默认值由 {@code application-biz.yml} 给出：系统临时目录下的 {@code cqt-uploads}）
     * @param urlPrefix 访问前缀，默认 {@code /uploads}
     */
    public record Local(
            @DefaultValue("") String root,
            @DefaultValue("/uploads") String urlPrefix) {}
}
