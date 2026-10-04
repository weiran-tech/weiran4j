package com.weiran.cqt.api.entry;

import java.util.List;

/** 我的报名。 */
public interface MyEntriesService {

    /** 本账号作为参赛人的全部未删除作品，按作品 ID 倒序。 */
    List<MyEntryView> list(long accountId);

    /**
     * 报名详情；不是本账号的作品抛 403「无权查看该报名记录」。
     *
     * @param accountId 当前账号
     * @param entryId 作品 ID
     */
    EntryDetailView detail(long accountId, long entryId);
}
