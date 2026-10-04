package com.weiran.cqt.api.region;

import org.jspecify.annotations.Nullable;

/**
 * 前台赛区项（字段名即 uniapp 读取的键）。
 *
 * @param id 赛区编号（{@code legacy_id}）
 * @param pid 上级赛区编号
 * @param name 名称
 * @param code 编码
 */
public record RegionView(
        long id, long pid, String name, @Nullable String code) {}
