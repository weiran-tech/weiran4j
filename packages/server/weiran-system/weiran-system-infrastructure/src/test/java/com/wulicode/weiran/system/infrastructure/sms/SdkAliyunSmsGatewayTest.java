package com.wulicode.weiran.system.infrastructure.sms;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.aliyun.dysmsapi20170525.Client;
import com.aliyun.dysmsapi20170525.models.SendSmsRequest;
import com.aliyun.dysmsapi20170525.models.SendSmsResponse;
import com.aliyun.dysmsapi20170525.models.SendSmsResponseBody;
import com.aliyun.teautil.models.RuntimeOptions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class SdkAliyunSmsGatewayTest {

    @Test
    @DisplayName("SDK 请求携带手机号签名模板参数并映射响应")
    void sendsSdkRequestAndMapsResponse() throws Exception {
        final Client client = org.mockito.Mockito.mock(Client.class);
        final RuntimeOptions options = SdkAliyunSmsGateway.runtimeOptions();
        final SendSmsResponseBody body = new SendSmsResponseBody().setCode("OK").setRequestId("request-1");
        when(client.sendSmsWithOptions(any(SendSmsRequest.class), any(RuntimeOptions.class)))
                .thenReturn(new SendSmsResponse().setBody(body));
        final SdkAliyunSmsGateway gateway = new SdkAliyunSmsGateway(client, options);

        final AliyunSmsGateway.Reply reply = gateway.send("13800138000", "签名", "SMS_123", "{\"code\":\"123456\"}");

        assertThat(reply.code()).isEqualTo("OK");
        assertThat(reply.requestId()).isEqualTo("request-1");
        final ArgumentCaptor<SendSmsRequest> requestCaptor = ArgumentCaptor.forClass(SendSmsRequest.class);
        final ArgumentCaptor<RuntimeOptions> optionsCaptor = ArgumentCaptor.forClass(RuntimeOptions.class);
        verify(client).sendSmsWithOptions(requestCaptor.capture(), optionsCaptor.capture());
        assertThat(requestCaptor.getValue().getPhoneNumbers()).isEqualTo("13800138000");
        assertThat(requestCaptor.getValue().getSignName()).isEqualTo("签名");
        assertThat(requestCaptor.getValue().getTemplateCode()).isEqualTo("SMS_123");
        assertThat(requestCaptor.getValue().getTemplateParam()).isEqualTo("{\"code\":\"123456\"}");
        assertThat(optionsCaptor.getValue().getAutoretry()).isFalse();
        assertThat(optionsCaptor.getValue().getMaxAttempts()).isEqualTo(1);
    }

    @Test
    @DisplayName("SDK 自动重试关闭且最多调用一次")
    void disablesSdkRetries() {
        final RuntimeOptions options = SdkAliyunSmsGateway.runtimeOptions();

        assertThat(options.getAutoretry()).isFalse();
        assertThat(options.getMaxAttempts()).isEqualTo(1);
    }

    @Test
    @DisplayName("空 SDK 响应映射为无代码结果")
    void mapsEmptySdkResponse() throws Exception {
        final Client client = org.mockito.Mockito.mock(Client.class);
        when(client.sendSmsWithOptions(any(SendSmsRequest.class), any(RuntimeOptions.class)))
                .thenReturn(null);
        final SdkAliyunSmsGateway gateway = new SdkAliyunSmsGateway(client, new RuntimeOptions());

        final AliyunSmsGateway.Reply reply = gateway.send("13800138000", "签名", "SMS_123", "{}");

        assertThat(reply.code()).isNull();
        assertThat(reply.requestId()).isNull();
    }
}
