package com.weiran.system.api.auth;

/**
 * 发起请求的客户端信息（由适配层从 HTTP 请求中解析）。
 *
 * @param ip 客户端 IP
 * @param userAgent User-Agent 原文
 */
public record ClientContext(String ip, String userAgent) {}
