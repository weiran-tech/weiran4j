package com.weiran.cqt.api.competition;

/**
 * 组别（字段名即前台键名）。
 *
 * @param id 组别 ID
 * @param name 名称
 * @param sort 排序（同 ID）
 */
public record GroupView(long id, String name, long sort) {}
