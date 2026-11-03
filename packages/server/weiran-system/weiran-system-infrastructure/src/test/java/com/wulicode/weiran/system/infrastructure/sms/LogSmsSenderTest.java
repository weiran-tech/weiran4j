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

class LogSmsSenderTest {

    @Test
    @DisplayName("log 模式记录短信模板参数并返回 LOGGED")
    void logsMessageAndReturnsLogged() {
        final Logger logger = (Logger) LoggerFactory.getLogger(LogSmsSender.class);
        final ListAppender<ILoggingEvent> appender = new ListAppender<>();
        appender.start();
        logger.addAppender(appender);
        final SmsSendOutcome outcome;
        try {
            outcome = new LogSmsSender(new ObjectMapper()).send("13800138000", "LOGIN_CODE", Map.of("code", "123456"));
        } finally {
            logger.detachAppender(appender);
            appender.stop();
        }

        assertThat(outcome).isEqualTo(SmsSendOutcome.LOGGED);
        assertThat(appender.list).hasSize(1);
        assertThat(appender.list.getFirst().getFormattedMessage())
                .contains("138****8000", "LOGIN_CODE", "{\"code\":\"123456\"}")
                .doesNotContain("13800138000");
    }
}
