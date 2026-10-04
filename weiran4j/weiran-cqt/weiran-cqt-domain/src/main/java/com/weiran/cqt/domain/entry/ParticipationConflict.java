package com.weiran.cqt.domain.entry;

/**
 * 已存在的冲突参赛记录。
 *
 * @param sourceDatabase 来源（zhongxi / qudao / houtai）
 * @param entryNo 报名号
 * @param title 作品名
 */
public record ParticipationConflict(String sourceDatabase, String entryNo, String title) {}
