package com.weiran.cqt.infrastructure.sms;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.weiran.cqt.domain.sms.SmsSendOutcome;
import com.weiran.cqt.infrastructure.autoconfigure.CqtProperties;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import org.jspecify.annotations.Nullable;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class AliyunSmsSenderTest {

    private static final String SECRET_VALUE = "super-secret-value";

    private static CqtProperties.Aliyun config(final String signName) {
        return new CqtProperties.Aliyun(
                "AKID",
                AliyunSmsSenderTest.SECRET_VALUE,
                signName,
                "SMS_1",
                "code",
                "dysmsapi.aliyuncs.com",
                Duration.ofSeconds(3),
                Duration.ofSeconds(5));
    }

    /** 记录请求、按预设返回或抛异常的假网关。 */
    private static final class FakeGateway implements AliyunSmsGateway {

        private final List<List<String>> calls = new ArrayList<>();

        private final @Nullable String code;

        private final boolean fail;

        FakeGateway(final @Nullable String code, final boolean fail) {
            this.code = code;
            this.fail = fail;
        }

        @Override
        public Reply send(
                final String phone, final String signName, final String templateCode, final String templateParam)
                throws Exception {
            this.calls.add(List.of(phone, signName, templateCode, templateParam));
            if (this.fail) {
                throw new java.io.IOException("connect timed out");
            }
            return new Reply(this.code, "msg", "REQ-1");
        }
    }

    private static SmsSendOutcome sendWith(final FakeGateway gateway) {
        return new AliyunSmsSender(AliyunSmsSenderTest.config("常青藤"), gateway, new ObjectMapper())
                .send("15533716215", "123456");
    }

    @Test
    @DisplayName("请求参数：手机号、签名、模板、模板参数 JSON；返回 OK 即成功，且不回显验证码")
    void buildsRequestAndSucceeds() {
        final FakeGateway gateway = new FakeGateway("OK", false);
        final AliyunSmsSender sender =
                new AliyunSmsSender(AliyunSmsSenderTest.config("常青藤"), gateway, new ObjectMapper());

        assertThat(sender.send("15533716215", "123456")).isEqualTo(SmsSendOutcome.SENT);
        assertThat(gateway.calls).containsExactly(List.of("15533716215", "常青藤", "SMS_1", "{\"code\":\"123456\"}"));
        assertThat(sender.exposesCode()).isFalse();
    }

    @Test
    @DisplayName("失败分类：频控、号码非法、其它返回码、调用异常")
    void classifiesFailures() {
        assertThat(AliyunSmsSenderTest.sendWith(new FakeGateway("isv.BUSINESS_LIMIT_CONTROL", false)))
                .isEqualTo(SmsSendOutcome.RATE_LIMITED);
        assertThat(AliyunSmsSenderTest.sendWith(new FakeGateway("isv.MOBILE_NUMBER_ILLEGAL", false)))
                .isEqualTo(SmsSendOutcome.INVALID_NUMBER);
        assertThat(AliyunSmsSenderTest.sendWith(new FakeGateway("isv.AMOUNT_NOT_ENOUGH", false)))
                .isEqualTo(SmsSendOutcome.FAILED);
        assertThat(AliyunSmsSenderTest.sendWith(new FakeGateway(null, false))).isEqualTo(SmsSendOutcome.FAILED);
        assertThat(AliyunSmsSenderTest.sendWith(new FakeGateway("OK", true))).isEqualTo(SmsSendOutcome.FAILED);
    }

    @Test
    @DisplayName("配置不全：启动失败，信息列出缺少的环境变量名，不含 AccessKey Secret 的值")
    void rejectsIncompleteConfig() {
        assertThatThrownBy(() -> AliyunSmsSender.create(AliyunSmsSenderTest.config(" "), new ObjectMapper()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("WEIRAN_CQT_SMS_ALIYUN_SIGN_NAME")
                .hasMessageNotContaining(AliyunSmsSenderTest.SECRET_VALUE)
                .hasMessageNotContaining("WEIRAN_CQT_SMS_ALIYUN_ACCESS_KEY_ID");

        final CqtProperties.Aliyun empty = new CqtProperties.Aliyun(
                "", "", "", "", "code", "dysmsapi.aliyuncs.com", Duration.ofSeconds(3), Duration.ofSeconds(5));
        assertThatThrownBy(() -> AliyunSmsSender.requireComplete(empty))
                .hasMessageContaining("WEIRAN_CQT_SMS_ALIYUN_ACCESS_KEY_ID")
                .hasMessageContaining("WEIRAN_CQT_SMS_ALIYUN_ACCESS_KEY_SECRET")
                .hasMessageContaining("WEIRAN_CQT_SMS_ALIYUN_TEMPLATE_CODE");
    }

    @Test
    @DisplayName("配置齐全时可以构造 SDK 客户端（不发起网络调用）")
    void createsSdkClient() {
        assertThat(AliyunSmsSender.create(AliyunSmsSenderTest.config("常青藤"), new ObjectMapper()))
                .isNotNull();
    }
}
