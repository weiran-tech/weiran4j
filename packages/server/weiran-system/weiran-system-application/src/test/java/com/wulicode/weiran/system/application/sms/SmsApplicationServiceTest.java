package com.wulicode.weiran.system.application.sms;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.wulicode.weiran.system.api.sms.SmsSendCommand;
import com.wulicode.weiran.system.api.sms.SmsSendResult;
import com.wulicode.weiran.system.domain.sms.SmsSendOutcome;
import com.wulicode.weiran.system.domain.sms.SmsSender;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class SmsApplicationServiceTest {

    @Mock
    private SmsSender smsSender;

    @InjectMocks
    private SmsApplicationService smsApplicationService;

    @Test
    @DisplayName("发送命令字段传给短信端口并映射结果")
    void sendsCommandAndMapsOutcome() {
        final Map<String, String> parameters = Map.of("code", "123456");
        final SmsSendCommand command = new SmsSendCommand("13800138000", "LOGIN_CODE", parameters);
        when(this.smsSender.send("13800138000", "LOGIN_CODE", parameters)).thenReturn(SmsSendOutcome.SENT);

        final SmsSendResult result = this.smsApplicationService.send(command);

        assertThat(result).isEqualTo(SmsSendResult.SENT);
        verify(this.smsSender).send("13800138000", "LOGIN_CODE", parameters);
    }

    @Test
    @DisplayName("短信端口的每种结果均映射为同名 API 结果")
    void mapsEveryOutcome() {
        for (final SmsSendOutcome outcome : SmsSendOutcome.values()) {
            final Map<String, String> parameters = Map.of("code", outcome.name());
            final SmsSendCommand command = new SmsSendCommand("13800138000", "LOGIN_CODE", parameters);
            when(this.smsSender.send(command.phone(), command.templateCode(), command.templateParameters()))
                    .thenReturn(outcome);

            assertThat(this.smsApplicationService.send(command)).isEqualTo(SmsSendResult.valueOf(outcome.name()));
        }
    }
}
