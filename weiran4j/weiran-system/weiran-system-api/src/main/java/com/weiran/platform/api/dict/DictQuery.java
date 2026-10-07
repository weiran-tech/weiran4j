package com.weiran.platform.api.dict;

import org.jspecify.annotations.Nullable;

/**
 * 字典分页查询条件。
 *
 * @param keyword 名称 / 编码
 * @param status 状态
 */
public record DictQuery(@Nullable String keyword, @Nullable String status) {}
