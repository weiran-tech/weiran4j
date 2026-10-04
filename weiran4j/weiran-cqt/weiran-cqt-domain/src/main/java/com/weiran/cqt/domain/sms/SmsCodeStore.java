package com.weiran.cqt.domain.sms;

import java.util.Optional;

/** 验证码存储端口（按手机号一条）。 */
public interface SmsCodeStore {

    /** 读取手机号的验证码。 */
    Optional<SmsCode> get(String phone);

    /** 写入（覆盖）。 */
    void put(String phone, SmsCode code);

    /** 删除。 */
    void remove(String phone);
}
