/**
 * weiran-system 适配层：把 HTTP 世界翻译成用例调用。
 *
 * <p>Controller 只做三件事：绑定与校验入参、调用应用服务、把结果交给 wuli3 的
 * {@code ApiResponseBodyAdvice} 包装。业务判断一律不在这一层——一旦出现，
 * 同一条规则就会在换协议（RPC、消息）时被复制第二遍。
 */
@NullMarked
package com.weiran.system.adapter;

import org.jspecify.annotations.NullMarked;
