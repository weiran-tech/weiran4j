package com.weiran.cqt.api.competition;

/**
 * 赛项（字段名即前台键名）。
 *
 * @param id 赛项编号
 * @param pid 上级编号
 * @param name 名称
 * @param sort 排序
 * @param status 状态
 * @param fujian 是否要求附件（1 / 0）
 */
public record CategoryView(long id, long pid, String name, int sort, int status, int fujian) {}
