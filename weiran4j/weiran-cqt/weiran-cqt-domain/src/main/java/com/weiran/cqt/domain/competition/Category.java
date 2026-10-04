package com.weiran.cqt.domain.competition;

/**
 * 赛项（一级 {@code parentLegacyId=0} 或二级）。对外 ID 用旧系统编号。
 *
 * @param legacyId 赛项编号
 * @param parentLegacyId 上级编号，0 为一级
 * @param name 名称
 * @param sortOrder 排序
 * @param status 1 启用
 * @param attachmentRequired 是否要求作品附件
 */
public record Category(
        long legacyId, long parentLegacyId, String name, int sortOrder, int status, boolean attachmentRequired) {

    /** 是否启用。 */
    public boolean isEnabled() {
        return this.status == 1;
    }

    /** 是否一级赛项。 */
    public boolean isFirstLevel() {
        return this.parentLegacyId == 0;
    }
}
