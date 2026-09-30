package com.weiran.platform.domain.dict;

import com.weiran.common.status.EnableStatus;
import org.jspecify.annotations.Nullable;

/**
 * 字典分页查询条件。
 *
 * @param keyword 匹配名称 / 编码，空表示不过滤
 * @param status 状态，空表示不过滤
 */
public record DictCriteria(
        @Nullable String keyword, @Nullable EnableStatus status) {}
