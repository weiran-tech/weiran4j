package com.wulicode.weiran.system.application.sms;

import com.wulicode.weiran.system.api.sms.SmsSendCommand;
import com.wulicode.weiran.system.api.sms.SmsSendResult;
import com.wulicode.weiran.system.api.sms.SmsService;
import com.wulicode.weiran.system.domain.sms.SmsSendOutcome;
import com.wulicode.weiran.system.domain.sms.SmsSender;

/** system 短信发送用例。 */
public class SmsApplicationService implements SmsService {

    private final SmsSender smsSender;

    public SmsApplicationService(final SmsSender smsSender) {
        this.smsSender = smsSender;
    }

    @Override
    public boolean isAvailable() {
        return this.smsSender.isAvailable();
    }

    @Override
    public SmsSendResult send(final SmsSendCommand command) {
        final SmsSendOutcome outcome =
                this.smsSender.send(command.phone(), command.templateCode(), command.templateParameters());
        return SmsSendResult.valueOf(outcome.name());
    }
}
