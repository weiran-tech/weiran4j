package com.weiran.cqt.api.entry;

/**
 * 报名结果。
 *
 * @param productId 作品 ID（前台键为全小写的 productid）
 * @param entryNo 报名号（前台键 {@code entry_no}）
 */
public record SignupResult(long productId, String entryNo) {}
