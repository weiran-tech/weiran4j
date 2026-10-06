/**
 * 外部身份提供方的实现（OIDC / CAS）、提供方配置与注册表、流程状态签名（D-015）。
 * HTTP 用 JDK {@code HttpClient}，id_token 用 jjwt 的 JWK 支持验签，不引入其它依赖。
 */
@NullMarked
package com.weiran.system.infrastructure.identity;

import org.jspecify.annotations.NullMarked;
