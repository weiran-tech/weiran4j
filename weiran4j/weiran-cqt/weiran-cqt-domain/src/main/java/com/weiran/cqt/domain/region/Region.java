package com.weiran.cqt.domain.region;

import org.jspecify.annotations.Nullable;

/**
 * 赛区。对外 ID 用旧系统编号 {@code legacyId}。
 *
 * @param legacyId 赛区编号
 * @param parentLegacyId 上级赛区编号（0 为顶级）
 * @param name 名称
 * @param code 编码
 */
public record Region(
        long legacyId,
        long parentLegacyId,
        String name,
        @Nullable String code) {}
