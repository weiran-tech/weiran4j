package com.weiran.framework.web;

/**
 * User-Agent 的粗粒度解析结果。
 *
 * @param browser 浏览器（含主版本号），如 {@code Chrome 126}；无法识别为 {@code Unknown}
 * @param os 操作系统，如 {@code macOS}；无法识别为 {@code Unknown}
 */
public record UserAgentInfo(String browser, String os) {}
