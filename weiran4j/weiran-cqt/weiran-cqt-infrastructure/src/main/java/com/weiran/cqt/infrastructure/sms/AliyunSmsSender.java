package com.weiran.cqt.infrastructure.sms;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.weiran.cqt.domain.account.Phones;
import com.weiran.cqt.domain.sms.SmsSendOutcome;
import com.weiran.cqt.domain.sms.SmsSender;
import com.weiran.cqt.infrastructure.autoconfigure.CqtProperties;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;

/**
 * 阿里云短信发送（{@code weiran.cqt.sms.mode=aliyun}）。
 *
 * <p>阿里云业务错误也是 HTTP 200，按返回码归类：{@code OK} 成功、{@code isv.BUSINESS_LIMIT_CONTROL} 服务商频控、
 * {@code isv.MOBILE_NUMBER_ILLEGAL} 号码非法，其余返回码与一切异常都是「其它失败」。不回显验证码；日志不记验证码与 AccessKey。
 */
@Slf4j
public final class AliyunSmsSender implements SmsSender {

    /** 成功返回码。 */
    static final String CODE_OK = "OK";

    /** 服务商频控（同一号码发送过于频繁等）。 */
    static final String CODE_RATE_LIMITED = "isv.BUSINESS_LIMIT_CONTROL";

    /** 号码非法。 */
    static final String CODE_INVALID_NUMBER = "isv.MOBILE_NUMBER_ILLEGAL";

    private final CqtProperties.Aliyun config;

    private final AliyunSmsGateway gateway;

    private final ObjectMapper objectMapper;

    AliyunSmsSender(
            final CqtProperties.Aliyun config, final AliyunSmsGateway gateway, final ObjectMapper objectMapper) {
        this.config = config;
        this.gateway = gateway;
        this.objectMapper = objectMapper;
    }

    /**
     * 校验配置并用官方 SDK 构造发送器；配置不全时抛异常让应用启动失败（异常信息只列环境变量名，不含任何值）。
     *
     * @param config 阿里云配置
     * @param objectMapper 序列化模板参数
     */
    public static AliyunSmsSender create(final CqtProperties.Aliyun config, final ObjectMapper objectMapper) {
        AliyunSmsSender.requireComplete(config);
        return new AliyunSmsSender(config, new SdkAliyunSmsGateway(config), objectMapper);
    }

    /** 四项必填配置缺任一项即抛 {@link IllegalStateException}，信息列出缺少的环境变量名。 */
    static void requireComplete(final CqtProperties.Aliyun config) {
        final List<String> missing = new ArrayList<>();
        if (config.accessKeyId().isBlank()) {
            missing.add("WEIRAN_CQT_SMS_ALIYUN_ACCESS_KEY_ID");
        }
        if (config.accessKeySecret().isBlank()) {
            missing.add("WEIRAN_CQT_SMS_ALIYUN_ACCESS_KEY_SECRET");
        }
        if (config.signName().isBlank()) {
            missing.add("WEIRAN_CQT_SMS_ALIYUN_SIGN_NAME");
        }
        if (config.templateCode().isBlank()) {
            missing.add("WEIRAN_CQT_SMS_ALIYUN_TEMPLATE_CODE");
        }
        if (!missing.isEmpty()) {
            throw new IllegalStateException(
                    "weiran.cqt.sms.mode=aliyun 但阿里云短信配置不全，缺少环境变量: " + String.join(", ", missing));
        }
    }

    @Override
    @SuppressWarnings("IllegalCatch") // SDK 方法声明 throws Exception：任何失败都只能归为「其它失败」，不能让发送接口抛 500。
    public SmsSendOutcome send(final String phone, final String code) {
        final AliyunSmsGateway.Reply reply;
        try {
            reply = this.gateway.send(
                    phone, this.config.signName(), this.config.templateCode(), this.templateParam(code));
        } catch (final Exception ex) {
            AliyunSmsSender.log.warn(
                    "阿里云短信调用异常 phone={} error={}",
                    Phones.mask(phone),
                    ex.getClass().getSimpleName());
            return SmsSendOutcome.FAILED;
        }
        final SmsSendOutcome outcome = AliyunSmsSender.classify(reply.code());
        if (outcome == SmsSendOutcome.SENT) {
            AliyunSmsSender.log.info("阿里云短信已发送 phone={} requestId={}", Phones.mask(phone), reply.requestId());
        } else {
            AliyunSmsSender.log.warn(
                    "阿里云短信发送失败 phone={} code={} message={} requestId={}",
                    Phones.mask(phone),
                    reply.code(),
                    reply.message(),
                    reply.requestId());
        }
        return outcome;
    }

    /** 按阿里云返回码归类。 */
    static SmsSendOutcome classify(final @org.jspecify.annotations.Nullable String code) {
        if (AliyunSmsSender.CODE_OK.equals(code)) {
            return SmsSendOutcome.SENT;
        }
        if (AliyunSmsSender.CODE_RATE_LIMITED.equals(code)) {
            return SmsSendOutcome.RATE_LIMITED;
        }
        if (AliyunSmsSender.CODE_INVALID_NUMBER.equals(code)) {
            return SmsSendOutcome.INVALID_NUMBER;
        }
        return SmsSendOutcome.FAILED;
    }

    private String templateParam(final String code) throws JsonProcessingException {
        return this.objectMapper.writeValueAsString(Map.of(this.config.templateParamName(), code));
    }
}
