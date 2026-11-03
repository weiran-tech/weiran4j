package com.wulicode.weiran.system.infrastructure.sms;

import static org.assertj.core.api.Assertions.assertThat;

import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.wulicode.weiran.system.domain.sms.SmsSendOutcome;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;

class LocalSmsSenderTest {

    @Test
    @DisplayName("local 模式替换验证码参数、记录短信内容并返回 LOGGED")
    void logsMessageAndReturnsLogged() {
        final Logger logger = (Logger) LoggerFactory.getLogger(LocalSmsSender.class);
        final ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        final SmsSendOutcome outcome;
        try {
            outcome = new LocalSmsSender(new ObjectMapper())
                    .send("13800138000", "你的验证码是 ${code} , 5 分钟有效, 请不要告知他人", Map.of("code", "123456"));
        } finally {
            logger.detachAppender(appender);
            appender.stop();
        }

        assertThat(outcome).isEqualTo(SmsSendOutcome.LOGGED);
        assertThat(appender.list).hasSize(1);
        assertThat(appender.list.getFirst().getFormattedMessage())
                .contains("138****8000", "你的验证码是 123456 , 5 分钟有效, 请不要告知他人", "{\"code\":\"123456\"}")
                .doesNotContain("13800138000", "${code}");
    }
}
