package com.weiran.cqt.infrastructure.sms;

import com.aliyun.dysmsapi20170525.Client;
import com.aliyun.dysmsapi20170525.models.SendSmsRequest;
import com.aliyun.dysmsapi20170525.models.SendSmsResponse;
import com.aliyun.dysmsapi20170525.models.SendSmsResponseBody;
import com.aliyun.teaopenapi.models.Config;
import com.aliyun.teautil.models.RuntimeOptions;
import com.weiran.cqt.infrastructure.autoconfigure.CqtProperties;

/** {@link AliyunSmsGateway} 的官方 SDK 实现。SendSms 不幂等，关闭 SDK 自动重试。 */
final class SdkAliyunSmsGateway implements AliyunSmsGateway {

    private final Client client;

    private final RuntimeOptions runtime;

    /** 用配置构造 SDK 客户端；调用前须已通过 {@link AliyunSmsSender#requireComplete} 校验。 */
    SdkAliyunSmsGateway(final CqtProperties.Aliyun config) {
        final int connectMillis = Math.toIntExact(config.connectTimeout().toMillis());
        final int readMillis = Math.toIntExact(config.readTimeout().toMillis());
        try {
            this.client = new Client(new Config()
                    .setAccessKeyId(config.accessKeyId())
                    .setAccessKeySecret(config.accessKeySecret())
                    .setEndpoint(config.endpoint())
                    .setConnectTimeout(connectMillis)
                    .setReadTimeout(readMillis));
        } catch (final Exception ex) {
            // 只带异常类名：SDK 的异常信息可能回显配置，不能让 AccessKey 进日志（宪法 CP-9）。
            throw new IllegalStateException("阿里云短信客户端初始化失败: " + ex.getClass().getSimpleName());
        }
        this.runtime = new RuntimeOptions()
                .setAutoretry(false)
                .setMaxAttempts(1)
                .setConnectTimeout(connectMillis)
                .setReadTimeout(readMillis);
    }

    @Override
    public Reply send(final String phone, final String signName, final String templateCode, final String templateParam)
            throws Exception {
        final SendSmsResponse response = this.client.sendSmsWithOptions(
                new SendSmsRequest()
                        .setPhoneNumbers(phone)
                        .setSignName(signName)
                        .setTemplateCode(templateCode)
                        .setTemplateParam(templateParam),
                this.runtime);
        final SendSmsResponseBody body = response == null ? null : response.getBody();
        return body == null
                ? new Reply(null, null, null)
                : new Reply(body.getCode(), body.getMessage(), body.getRequestId());
    }
}
