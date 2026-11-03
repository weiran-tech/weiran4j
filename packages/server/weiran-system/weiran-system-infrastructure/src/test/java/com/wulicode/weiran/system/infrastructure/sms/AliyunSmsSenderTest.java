package com.wulicode.weiran.system.infrastructure.sms;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.wulicode.weiran.system.domain.sms.SmsSendOutcome;
import com.wulicode.weiran.system.domain.sms.SmsSettings;
import java.util.List;
import java.util.Map;
import org.jspecify.annotations.Nullable;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;

class AliyunSmsSenderTest {

    private static final SmsSettings SMS_SETTINGS = new SmsSettings() {
        @Override
        public String signName() {
            return "示例签名";
        }

        @Override
        public String verificationTemplateCode() {
            return "SMS_123";
        }
    };

    @Test
    @DisplayName("成功请求将模板参数序列化后交给网关")
    void serializesParametersAndSendsRequest() {
        final CapturingGateway gateway = new CapturingGateway(new AliyunSmsGateway.Reply("OK", "request-1"));
        final AliyunSmsSender sender =
                new AliyunSmsSender(AliyunSmsSenderTest.SMS_SETTINGS, gateway, new ObjectMapper());

        final SmsSendOutcome result = sender.send("13800138000", "SMS_123", Map.of("code", "123456"));

        assertThat(result).isEqualTo(SmsSendOutcome.SENT);
        assertThat(gateway.phone).isEqualTo("13800138000");
        assertThat(gateway.signName).isEqualTo("示例签名");
        assertThat(gateway.templateCode).isEqualTo("SMS_123");
        assertThat(gateway.templateParam).isEqualTo("{\"code\":\"123456\"}");
    }

    @Test
    @DisplayName("阿里云业务码映射为稳定的发送结果")
    void mapsProviderCodes() {
        assertThat(AliyunSmsSenderTest.sendWithCode("OK")).isEqualTo(SmsSendOutcome.SENT);
        assertThat(AliyunSmsSenderTest.sendWithCode("isv.BUSINESS_LIMIT_CONTROL"))
                .isEqualTo(SmsSendOutcome.RATE_LIMITED);
        assertThat(AliyunSmsSenderTest.sendWithCode("isv.MOBILE_NUMBER_ILLEGAL"))
                .isEqualTo(SmsSendOutcome.INVALID_NUMBER);
        assertThat(AliyunSmsSenderTest.sendWithCode("InternalError")).isEqualTo(SmsSendOutcome.FAILED);
        assertThat(AliyunSmsSenderTest.sendWithCode(null)).isEqualTo(SmsSendOutcome.FAILED);
    }

    @Test
    @DisplayName("网关异常转换为失败结果")
    void convertsGatewayExceptionToFailure() {
        final AliyunSmsGateway gateway = (phone, signName, templateCode, templateParam) -> {
            throw new IllegalStateException("sensitive provider response");
        };
        final AliyunSmsSender sender =
                new AliyunSmsSender(AliyunSmsSenderTest.SMS_SETTINGS, gateway, new ObjectMapper());

        assertThat(sender.send("13800138000", "SMS_123", Map.of("code", "123456")))
                .isEqualTo(SmsSendOutcome.FAILED);
    }

    @Test
    @DisplayName("异常日志仅包含脱敏手机号和异常类型")
    void masksSensitiveValuesInFailureLog() {
        final AliyunSmsGateway gateway = (phone, signName, templateCode, templateParam) -> {
            throw new IllegalStateException("sensitive provider response");
        };
        final AliyunSmsSender sender =
                new AliyunSmsSender(AliyunSmsSenderTest.SMS_SETTINGS, gateway, new ObjectMapper());
        final List<ILoggingEvent> events =
                AliyunSmsSenderTest.captureLog(sender, "13800138000", Map.of("code", "123456"));

        assertThat(events).hasSize(1);
        assertThat(events.getFirst().getFormattedMessage())
                .contains("138****8000", "IllegalStateException")
                .doesNotContain("13800138000", "123456", "sensitive provider response");
    }

    @Test
    @DisplayName("成功与服务商失败日志均脱敏手机号且不记录模板参数")
    void masksSensitiveValuesInProviderLogs() {
        final AliyunSmsSender successSender = new AliyunSmsSender(
                AliyunSmsSenderTest.SMS_SETTINGS,
                new CapturingGateway(new AliyunSmsGateway.Reply("OK", "request-success")),
                new ObjectMapper());
        final AliyunSmsSender failedSender = new AliyunSmsSender(
                AliyunSmsSenderTest.SMS_SETTINGS,
                new CapturingGateway(new AliyunSmsGateway.Reply("isv.BUSINESS_LIMIT_CONTROL", "request-failed")),
                new ObjectMapper());

        final List<ILoggingEvent> successEvents =
                AliyunSmsSenderTest.captureLog(successSender, "13800138000", Map.of("code", "123456"));
        final List<ILoggingEvent> failedEvents =
                AliyunSmsSenderTest.captureLog(failedSender, "13800138000", Map.of("code", "654321"));

        assertThat(successEvents).hasSize(1);
        assertThat(successEvents.getFirst().getFormattedMessage())
                .contains("138****8000", "request-success")
                .doesNotContain("13800138000", "123456", "access-secret");
        assertThat(failedEvents).hasSize(1);
        assertThat(failedEvents.getFirst().getFormattedMessage())
                .contains("138****8000", "isv.BUSINESS_LIMIT_CONTROL", "request-failed")
                .doesNotContain("13800138000", "654321", "access-secret");
    }

    @Test
    @DisplayName("阿里云模式缺少密钥时报告环境变量名且不暴露密钥")
    void rejectsMissingCredentialsWithoutLeakingSecrets() {
        final SystemSmsProperties incomplete =
                new SystemSmsProperties("aliyun", new SystemSmsProperties.Aliyun("", "secret-value"));

        assertThatThrownBy(
                        () -> AliyunSmsSender.create(incomplete, AliyunSmsSenderTest.SMS_SETTINGS, new ObjectMapper()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("WEIRAN_SMS_ALIYUN_ACCESS_KEY_ID")
                .hasMessageNotContaining("secret-value");
    }

    @Test
    @DisplayName("默认关闭模式返回未配置且不调用云服务")
    void keepsSmsDisabledByDefault() {
        final SmsSendOutcome outcome = new DisabledSmsSender().send("13800138000", "SMS_123", Map.of());

        assertThat(outcome).isEqualTo(SmsSendOutcome.NOT_CONFIGURED);
    }

    private static SmsSendOutcome sendWithCode(final @Nullable String code) {
        final AliyunSmsGateway gateway =
                (phone, signName, templateCode, templateParam) -> new AliyunSmsGateway.Reply(code, "request-1");
        final AliyunSmsSender sender =
                new AliyunSmsSender(AliyunSmsSenderTest.SMS_SETTINGS, gateway, new ObjectMapper());
        return sender.send("13800138000", "SMS_123", Map.of());
    }

    private static List<ILoggingEvent> captureLog(
            final AliyunSmsSender sender, final String phone, final Map<String, String> parameters) {
        final Logger logger = (Logger) LoggerFactory.getLogger(AliyunSmsSender.class);
        final ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        try {
            sender.send(phone, "SMS_123", parameters);
            return List.copyOf(appender.list);
        } finally {
            logger.detachAppender(appender);
            appender.stop();
        }
    }

    private static final class CapturingGateway implements AliyunSmsGateway {

        private final Reply reply;
        private String phone = "";
        private String signName = "";
        private String templateCode = "";
        private String templateParam = "";

        private CapturingGateway(final Reply reply) {
            this.reply = reply;
        }

        @Override
        public Reply send(
                final String phone, final String signName, final String templateCode, final String templateParam) {
            this.phone = phone;
            this.signName = signName;
            this.templateCode = templateCode;
            this.templateParam = templateParam;
            return this.reply;
        }
    }
}
