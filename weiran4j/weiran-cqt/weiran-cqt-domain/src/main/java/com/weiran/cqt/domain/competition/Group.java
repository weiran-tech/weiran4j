package com.weiran.cqt.domain.competition;

/**
 * 组别（按赛事配置，赛项编号为 0 表示该层级通用）。
 *
 * @param id 组别 ID
 * @param name 名称
 */
public record Group(long id, String name) {}
