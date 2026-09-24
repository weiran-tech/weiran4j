package com.weiran.system.domain.port;

import com.weiran.system.domain.account.Account;

/**
 * 密码指纹计算端口。
 *
 * <p>指纹写进令牌，并在每次令牌校验时与账号当前状态重算比对。它必须满足两点：
 * 密码变则指纹变，且指纹本身不能反推出密码哈希。
 */
public interface PasswordStampFactory {

    /** 计算账号当前的密码指纹。 */
    String stampOf(Account account);
}
