package com.weiran.platform.api.dict;

import org.jspecify.annotations.Nullable;

/**
 * 新增 / 修改字典。
 *
 * @param name 名称
 * @param code 编码
 * @param description 描述
 * @param status 状态，空为 enabled
 */
public record SaveDictCommand(
        String name,
        String code,
        @Nullable String description,
        @Nullable String status) {}
